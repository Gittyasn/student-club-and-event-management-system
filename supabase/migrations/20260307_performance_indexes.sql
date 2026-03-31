-- ==============================================================================
-- MODULE 19: PERFORMANCE INDEXES & DATABASE OPTIMIZATION
-- Migration Version: 20260307
-- ==============================================================================
-- Covers: Composite indexes, partial indexes, covering indexes,
--         materialized view for analytics, and refresh function.
-- ==============================================================================


-- ==============================================================================
-- SECTION 1: COMPOSITE INDEXES FOR CRITICAL QUERY PATTERNS
-- ==============================================================================

-- 1a. Registrations: Most queried combination for dashboard lookups
CREATE INDEX IF NOT EXISTS idx_registrations_event_user
    ON public.registrations(event_id, user_id);

CREATE INDEX IF NOT EXISTS idx_registrations_user_status
    ON public.registrations(user_id, status);

CREATE INDEX IF NOT EXISTS idx_registrations_event_status
    ON public.registrations(event_id, status);

-- 1b. Club memberships: Coordinator dashboard and member count queries
CREATE INDEX IF NOT EXISTS idx_memberships_club_status
    ON public.club_memberships(club_id, status);

CREATE INDEX IF NOT EXISTS idx_memberships_user_status
    ON public.club_memberships(user_id, status);

-- 1c. Attendance records: Event analytics and student history
CREATE INDEX IF NOT EXISTS idx_attendance_event_status
    ON public.attendance_records(event_id, status);

CREATE INDEX IF NOT EXISTS idx_attendance_user_event
    ON public.attendance_records(user_id, event_id);

-- 1d. Notifications: Paginated feed for students
CREATE INDEX IF NOT EXISTS idx_notifications_user_created
    ON public.notifications(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_read
    ON public.notifications(user_id, is_read);

-- 1e. Audit logs: Security dashboard time-range queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_created
    ON public.audit_logs(actor_id, created_at DESC);

-- 1f. Messages: Chat pagination (most critical for realtime)
CREATE INDEX IF NOT EXISTS idx_messages_chat_created
    ON public.messages(chat_id, created_at DESC)
    WHERE deleted = false; -- Partial: only non-deleted messages

-- 1g. Events: Key lookups
CREATE INDEX IF NOT EXISTS idx_events_club_status
    ON public.events(club_id, status);

CREATE INDEX IF NOT EXISTS idx_events_status_approval
    ON public.events(status, approval_status);

CREATE INDEX IF NOT EXISTS idx_events_start_time
    ON public.events(start_time DESC);

-- 1h. Certificates: Student certificate history
CREATE INDEX IF NOT EXISTS idx_certificates_user_status
    ON public.certificates(user_id, status);

-- 1i. Results: Published results by event
CREATE INDEX IF NOT EXISTS idx_results_event_status
    ON public.results(event_id, status);

CREATE INDEX IF NOT EXISTS idx_results_event_rank
    ON public.results(event_id, rank ASC)
    WHERE status IN ('published', 'locked'); -- Partial: only visible results

-- 1j. Login logs: Security dashboard (last 24h queries)
DO $$
BEGIN
    IF to_regclass('public.login_logs') IS NOT NULL THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_login_logs_status_created ON public.login_logs(status, created_at DESC)';
    END IF;
END $$;

-- 1k. Security events: Severity-based incident listing
DO $$
BEGIN
    IF to_regclass('public.security_events') IS NOT NULL THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_security_events_severity_created ON public.security_events(resolved, severity, created_at DESC)';
    END IF;
END $$;


-- ==============================================================================
-- SECTION 2: PARTIAL INDEXES (smaller, targeted, very fast)
-- ==============================================================================

-- Active events only (student browse — the most common query)
CREATE INDEX IF NOT EXISTS idx_events_active_approved
    ON public.events(start_time DESC, club_id)
    WHERE status NOT IN ('archived', 'cancelled')
      AND approval_status = 'approved';

-- Approved memberships only (club roster counts)
CREATE INDEX IF NOT EXISTS idx_memberships_approved_club
    ON public.club_memberships(club_id, user_id)
    WHERE status = 'approved';

-- Open registrations (waitlist and registered count)
CREATE INDEX IF NOT EXISTS idx_registrations_open
    ON public.registrations(event_id, created_at)
    WHERE status IN ('registered', 'waitlisted');

-- Pending event approvals (admin workflow)
CREATE INDEX IF NOT EXISTS idx_events_pending_approval
    ON public.events(created_at DESC)
    WHERE approval_status = 'pending';

-- Active users only (admin user management)
CREATE INDEX IF NOT EXISTS idx_profiles_active_role
    ON public.profiles(role, created_at DESC)
    WHERE account_status = 'active';

-- Unread notifications (notification bell count)
CREATE INDEX IF NOT EXISTS idx_notifications_unread
    ON public.notifications(user_id, created_at DESC)
    WHERE is_read = false;

-- Valid (non-revoked) certificates
CREATE INDEX IF NOT EXISTS idx_certificates_valid
    ON public.certificates(user_id, generated_at DESC)
    WHERE status = 'valid';


-- ==============================================================================
-- SECTION 3: MATERIALIZED VIEW — EVENT PERFORMANCE STATS
-- Pre-aggregates heavy analytics joins for dashboard speed.
-- ==============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_event_stats AS
    SELECT
        e.id                                    AS event_id,
        e.title,
        e.club_id,
        e.status,
        e.start_time,
        e.max_participants AS capacity,
        -- Registration metrics
        COUNT(DISTINCT r.id) FILTER (WHERE r.status IN ('registered', 'confirmed', 'attended'))
                                                AS registration_count,
        COUNT(DISTINCT r.id) FILTER (WHERE r.status = 'waitlisted')
                                                AS waitlist_count,
        COUNT(DISTINCT r.id) FILTER (WHERE r.status = 'cancelled')
                                                AS cancellation_count,
        -- Attendance metrics
        COUNT(DISTINCT ar.id) FILTER (WHERE ar.status = 'present')
                                                AS attendance_present,
        COUNT(DISTINCT ar.id) FILTER (WHERE ar.status = 'absent')
                                                AS attendance_absent,
        -- Feedback metrics
        COUNT(DISTINCT f.id)                    AS feedback_count,
        ROUND(AVG(f.rating), 2)                 AS avg_rating,
        -- Certificate metrics
        COUNT(DISTINCT c.id) FILTER (WHERE c.status = 'valid')
                                                AS certificates_issued,
        -- Capacity fill rate (0-100)
        CASE
            WHEN e.max_participants IS NULL OR e.max_participants = 0 THEN NULL
            ELSE ROUND(
                COUNT(DISTINCT r.id) FILTER (WHERE r.status IN ('registered', 'confirmed', 'attended'))::numeric
                / e.max_participants * 100, 1
            )
        END                                     AS fill_rate_pct,
        NOW()                                   AS last_refreshed
    FROM public.events e
    LEFT JOIN public.registrations r ON r.event_id = e.id
    LEFT JOIN public.attendance_records ar ON ar.event_id = e.id
    LEFT JOIN public.feedback f ON f.event_id = e.id
    LEFT JOIN public.certificates c ON c.event_id = e.id
    WHERE e.status NOT IN ('archived')
    GROUP BY e.id, e.title, e.club_id, e.status, e.start_time, e.max_participants;

-- Index the materialized view for fast lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_event_stats_event_id
    ON public.mv_event_stats(event_id);

CREATE INDEX IF NOT EXISTS idx_mv_event_stats_club
    ON public.mv_event_stats(club_id);

CREATE INDEX IF NOT EXISTS idx_mv_event_stats_start
    ON public.mv_event_stats(start_time DESC);

-- ==============================================================================
-- SECTION 4: REFRESH FUNCTION (Admin-callable + schedulable)
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.refresh_event_stats()
RETURNS TEXT AS $$
DECLARE
    v_start TIMESTAMP := clock_timestamp();
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_event_stats;
    RETURN format('Refreshed in %s ms', EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start)::integer);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to admin role
COMMENT ON FUNCTION public.refresh_event_stats() IS
    'Admin-callable function to refresh the mv_event_stats materialized view. Safe to call anytime — uses CONCURRENTLY so it does not lock reads.';


-- ==============================================================================
-- SECTION 5: QUERY HELPER — PAGINATED EVENTS WITH STATS
-- Returns events with pre-computed stats for dashboard, paginated via cursor
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.get_paginated_events(
    p_status TEXT DEFAULT NULL,
    p_club_id UUID DEFAULT NULL,
    p_cursor TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
    event_id UUID,
    title TEXT,
    club_id UUID,
    status TEXT,
    start_time TIMESTAMP WITH TIME ZONE,
    registration_count BIGINT,
    fill_rate_pct NUMERIC,
    avg_rating NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ms.event_id,
        ms.title,
        ms.club_id,
        ms.status,
        ms.start_time,
        ms.registration_count,
        ms.fill_rate_pct,
        ms.avg_rating
    FROM public.mv_event_stats ms
    WHERE (p_status IS NULL OR ms.status = p_status)
      AND (p_club_id IS NULL OR ms.club_id = p_club_id)
      AND ms.start_time < p_cursor
    ORDER BY ms.start_time DESC
    LIMIT LEAST(p_limit, 100); -- Hard cap at 100
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;


-- ==============================================================================
-- DONE: Module 19 — Performance Indexes Migration Complete
-- ==============================================================================
