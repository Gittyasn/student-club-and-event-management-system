-- ==============================================================================
-- Registration hardening + admin analytics RPC alignment
-- Migration Version: 20260331
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.enforce_registration_membership_rules()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_requires_membership BOOLEAN := false;
    v_club_id UUID;
    v_actor_id UUID := auth.uid();
    v_actor_can_override BOOLEAN := false;
BEGIN
    IF NEW.event_id IS NULL OR NEW.user_id IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT e.requires_membership, e.club_id
    INTO v_requires_membership, v_club_id
    FROM public.events e
    WHERE e.id = NEW.event_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Event does not exist.';
    END IF;

    IF NOT COALESCE(v_requires_membership, false) THEN
        RETURN NEW;
    END IF;

    IF NEW.status IN ('cancelled', 'rejected') THEN
        RETURN NEW;
    END IF;

    IF v_actor_id IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = v_actor_id
          AND (
              p.role = 'admin'
              OR (
                  p.role = 'coordinator'
                  AND (
                      p.club_id = v_club_id
                      OR EXISTS (
                          SELECT 1
                          FROM public.clubs c
                          WHERE c.id = v_club_id
                            AND c.coordinator_id = v_actor_id
                      )
                  )
              )
          )
    )
    INTO v_actor_can_override;

    IF v_actor_can_override THEN
        RETURN NEW;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.club_memberships cm
        WHERE cm.club_id = v_club_id
          AND cm.user_id = NEW.user_id
          AND cm.status IN ('approved', 'core_member', 'sub_coordinator')
    ) THEN
        RETURN NEW;
    END IF;

    RAISE EXCEPTION 'Approved club membership is required for this event.'
        USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_registration_membership_rules ON public.registrations;
CREATE TRIGGER trg_enforce_registration_membership_rules
    BEFORE INSERT OR UPDATE OF event_id, user_id, status
    ON public.registrations
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_registration_membership_rules();


CREATE OR REPLACE FUNCTION public.get_admin_analytics_snapshot()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_payload JSONB;
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid()
          AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Unauthorized: Only admins can view analytics.';
    END IF;

    WITH notification_metrics AS (
        SELECT
            COUNT(*)::INT AS total_notifications,
            COUNT(*) FILTER (WHERE is_read)::INT AS read_notifications,
            BOOL_OR(delivered = true) AS has_delivery_telemetry,
            COUNT(*) FILTER (WHERE delivered IS DISTINCT FROM false)::INT AS delivered_or_unknown
        FROM public.notifications
    ),
    monthly_series AS (
        SELECT
            month_start,
            TO_CHAR(month_start, 'YYYY-MM') AS month_key,
            TRIM(TO_CHAR(month_start, 'Mon')) AS label
        FROM generate_series(
            date_trunc('month', CURRENT_DATE) - INTERVAL '5 months',
            date_trunc('month', CURRENT_DATE),
            INTERVAL '1 month'
        ) AS series(month_start)
    ),
    monthly_events AS (
        SELECT TO_CHAR(date_trunc('month', created_at), 'YYYY-MM') AS month_key, COUNT(*)::INT AS event_count
        FROM public.events
        GROUP BY 1
    ),
    monthly_registrations AS (
        SELECT TO_CHAR(date_trunc('month', COALESCE(registered_at, created_at)), 'YYYY-MM') AS month_key, COUNT(*)::INT AS registration_count
        FROM public.registrations
        GROUP BY 1
    ),
    monthly_members AS (
        SELECT TO_CHAR(date_trunc('month', joined_at), 'YYYY-MM') AS month_key, COUNT(*)::INT AS member_count
        FROM public.club_memberships
        WHERE status IN ('approved', 'core_member', 'sub_coordinator')
        GROUP BY 1
    ),
    monthly_attendance AS (
        SELECT
            TO_CHAR(date_trunc('month', marked_at), 'YYYY-MM') AS month_key,
            COUNT(*) FILTER (WHERE status IN ('present', 'late'))::INT AS present_count,
            COUNT(*) FILTER (WHERE status NOT IN ('present', 'late'))::INT AS absent_count
        FROM public.attendance_records
        GROUP BY 1
    ),
    club_perf AS (
        SELECT
            LEFT(COALESCE(NULLIF(TRIM(c.name), ''), 'Unknown'), 18) AS name,
            COUNT(DISTINCT e.id)::INT AS events_count,
            COUNT(r.id)::INT AS registrations_count,
            COALESCE(
                ROUND(
                    100.0 * COUNT(ar.id) FILTER (WHERE ar.status IN ('present', 'late'))
                    / NULLIF(COUNT(ar.id), 0)
                ),
                0
            )::INT AS attendance_rate
        FROM public.clubs c
        LEFT JOIN public.events e ON e.club_id = c.id
        LEFT JOIN public.registrations r ON r.event_id = e.id
        LEFT JOIN public.attendance_records ar ON ar.event_id = e.id
        GROUP BY c.id, c.name
        ORDER BY registrations_count DESC, name
        LIMIT 8
    ),
    dept_ranking AS (
        SELECT
            COALESCE(NULLIF(TRIM(p.department), ''), 'Unknown') AS name,
            COUNT(*)::INT AS registration_count
        FROM public.registrations r
        LEFT JOIN public.profiles p ON p.id = r.user_id
        GROUP BY 1
        ORDER BY registration_count DESC, name
        LIMIT 8
    ),
    category_distribution AS (
        SELECT
            COALESCE(NULLIF(TRIM(ec.name), ''), 'Uncategorized') AS name,
            COUNT(*)::INT AS value
        FROM public.events e
        LEFT JOIN public.event_categories ec ON ec.id = e.category_id
        GROUP BY 1
        ORDER BY value DESC, name
        LIMIT 8
    ),
    rating_distribution AS (
        SELECT
            rating_bucket,
            COUNT(*)::INT AS value
        FROM (
            SELECT LEAST(GREATEST(ROUND(COALESCE(rating, 0)), 1), 5)::INT AS rating_bucket
            FROM public.feedback
        ) buckets
        GROUP BY rating_bucket
    )
    SELECT jsonb_build_object(
        'totalClubs',
        CASE
            WHEN EXISTS (SELECT 1 FROM public.clubs WHERE status = 'active') THEN
                (SELECT COUNT(*)::INT FROM public.clubs WHERE status = 'active')
            ELSE
                (SELECT COUNT(*)::INT FROM public.clubs)
        END,
        'totalUsers', (SELECT COUNT(*)::INT FROM public.profiles),
        'totalEvents', (SELECT COUNT(*)::INT FROM public.events),
        'totalRegistrations', (SELECT COUNT(*)::INT FROM public.registrations),
        'totalCertificates', (SELECT COUNT(*)::INT FROM public.certificates WHERE status = 'valid'),
        'totalMemberships', (
            SELECT COUNT(*)::INT
            FROM public.club_memberships
            WHERE status IN ('approved', 'core_member', 'sub_coordinator')
        ),
        'totalNotifications', COALESCE((SELECT total_notifications FROM notification_metrics), 0),
        'readRate', COALESCE((
            SELECT ROUND(100.0 * read_notifications / NULLIF(total_notifications, 0), 1)
            FROM notification_metrics
        ), 0),
        'deliverySuccess', COALESCE((
            SELECT CASE
                WHEN total_notifications = 0 THEN 0
                WHEN has_delivery_telemetry THEN ROUND(100.0 * delivered_or_unknown / NULLIF(total_notifications, 0))
                ELSE 100
            END
            FROM notification_metrics
        ), 0),
        'attendanceRate', COALESCE((
            SELECT ROUND(
                100.0 * COUNT(*) FILTER (WHERE status IN ('present', 'late'))
                / NULLIF(COUNT(*), 0),
                1
            )
            FROM public.attendance_records
        ), 0),
        'avgRating', (
            SELECT ROUND(AVG(rating), 1)
            FROM public.feedback
        ),
        'monthlyTrend', COALESCE((
            SELECT jsonb_agg(
                jsonb_build_object(
                    'name', ms.label,
                    'Events', COALESCE(me.event_count, 0),
                    'Registrations', COALESCE(mr.registration_count, 0),
                    'Members', COALESCE(mm.member_count, 0)
                )
                ORDER BY ms.month_start
            )
            FROM monthly_series ms
            LEFT JOIN monthly_events me ON me.month_key = ms.month_key
            LEFT JOIN monthly_registrations mr ON mr.month_key = ms.month_key
            LEFT JOIN monthly_members mm ON mm.month_key = ms.month_key
        ), '[]'::JSONB),
        'attendanceTrend', COALESCE((
            SELECT jsonb_agg(
                jsonb_build_object(
                    'name', ms.label,
                    'Present', COALESCE(ma.present_count, 0),
                    'Absent', COALESCE(ma.absent_count, 0)
                )
                ORDER BY ms.month_start
            )
            FROM monthly_series ms
            LEFT JOIN monthly_attendance ma ON ma.month_key = ms.month_key
        ), '[]'::JSONB),
        'clubPerf', COALESCE((
            SELECT jsonb_agg(
                jsonb_build_object(
                    'name', cp.name,
                    'Events', cp.events_count,
                    'Registrations', cp.registrations_count,
                    'AttendanceRate', cp.attendance_rate
                )
                ORDER BY cp.registrations_count DESC, cp.name
            )
            FROM club_perf cp
        ), '[]'::JSONB),
        'deptRanking', COALESCE((
            SELECT jsonb_agg(
                jsonb_build_object(
                    'name', dr.name,
                    'count', dr.registration_count
                )
                ORDER BY dr.registration_count DESC, dr.name
            )
            FROM dept_ranking dr
        ), '[]'::JSONB),
        'categoryDist', COALESCE((
            SELECT jsonb_agg(
                jsonb_build_object(
                    'name', cd.name,
                    'value', cd.value
                )
                ORDER BY cd.value DESC, cd.name
            )
            FROM category_distribution cd
        ), '[]'::JSONB),
        'ratingDist', COALESCE((
            SELECT jsonb_agg(
                jsonb_build_object(
                    'name', gs.rating_label,
                    'value', COALESCE(rd.value, 0)
                )
                ORDER BY gs.rating
            )
            FROM (
                SELECT rating, CONCAT(rating, '*') AS rating_label
                FROM generate_series(1, 5) AS series(rating)
            ) gs
            LEFT JOIN rating_distribution rd ON rd.rating_bucket = gs.rating
        ), '[]'::JSONB)
    )
    INTO v_payload;

    RETURN v_payload;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_analytics_snapshot() TO authenticated;
