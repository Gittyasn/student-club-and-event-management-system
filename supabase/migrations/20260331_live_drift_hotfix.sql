-- ==============================================================================
-- Live drift hotfix for already-deployed environments
-- Fixes audit_logs schema drift and AI recommendation RPC alignment
-- ==============================================================================

ALTER TABLE public.audit_logs
    ADD COLUMN IF NOT EXISTS module TEXT,
    ADD COLUMN IF NOT EXISTS entity_type TEXT,
    ADD COLUMN IF NOT EXISTS entity_id UUID,
    ADD COLUMN IF NOT EXISTS old_values JSONB,
    ADD COLUMN IF NOT EXISTS new_values JSONB;

UPDATE public.audit_logs
SET entity_type = COALESCE(entity_type, target_table, module, 'system')
WHERE entity_type IS NULL;

ALTER TABLE public.audit_logs
    ALTER COLUMN entity_type DROP NOT NULL;

CREATE OR REPLACE FUNCTION public.get_event_recommendations(p_user_id UUID, p_limit INT DEFAULT 6)
RETURNS TABLE (
    event_id UUID,
    title TEXT,
    banner_url TEXT,
    start_time TIMESTAMP WITH TIME ZONE,
    match_score INT,
    recommendation_reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH user_clubs AS (
        SELECT club_id
        FROM public.club_memberships
        WHERE user_id = p_user_id
          AND status IN ('approved', 'active', 'core_member', 'sub_coordinator')
    ),
    user_categories AS (
        SELECT e.category_id, COUNT(*)::INT AS cat_weight
        FROM public.attendance_records a
        JOIN public.events e ON e.id = a.event_id
        WHERE a.user_id = p_user_id
          AND a.status IN ('present', 'late')
          AND e.category_id IS NOT NULL
        GROUP BY e.category_id
    )
    SELECT
        e.id AS event_id,
        e.title,
        COALESCE(e.poster_url, c.banner_url) AS banner_url,
        e.start_time,
        (
            COALESCE(uc.cat_weight, 0) * 10
            + CASE WHEN cl.club_id IS NOT NULL THEN 20 ELSE 0 END
            + CASE
                WHEN COALESCE(e.max_participants, 0) > 0
                AND (
                    SELECT COUNT(*)
                    FROM public.registrations r
                    WHERE r.event_id = e.id
                      AND r.status = 'registered'
                ) >= (COALESCE(e.max_participants, 0) * 0.8)
                THEN 5
                ELSE 0
              END
        )::INT AS match_score,
        CASE
            WHEN cl.club_id IS NOT NULL THEN 'From your club activity'
            WHEN COALESCE(uc.cat_weight, 0) > 0 THEN 'Matches categories you attended before'
            ELSE 'Popular upcoming event'
        END::TEXT AS recommendation_reason
    FROM public.events e
    LEFT JOIN public.clubs c ON c.id = e.club_id
    LEFT JOIN user_categories uc ON uc.category_id = e.category_id
    LEFT JOIN user_clubs cl ON cl.club_id = e.club_id
    WHERE e.approval_status = 'approved'
      AND COALESCE(e.visibility, 'public') <> 'hidden'
      AND e.start_time > NOW()
      AND NOT EXISTS (
          SELECT 1
          FROM public.registrations r
          WHERE r.event_id = e.id
            AND r.user_id = p_user_id
      )
    ORDER BY match_score DESC, e.start_time ASC
    LIMIT p_limit;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_club_recommendations(p_user_id UUID, p_limit INT DEFAULT 4)
RETURNS TABLE (
    club_id UUID,
    name TEXT,
    logo_url TEXT,
    match_score INT,
    recommendation_reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_dept TEXT;
BEGIN
    SELECT department INTO user_dept
    FROM public.profiles
    WHERE id = p_user_id;

    RETURN QUERY
    WITH attended_events AS (
        SELECT e.club_id, COUNT(*)::INT AS hit_rate
        FROM public.attendance_records a
        JOIN public.events e ON e.id = a.event_id
        WHERE a.user_id = p_user_id
          AND a.status IN ('present', 'late')
        GROUP BY e.club_id
    )
    SELECT
        c.id AS club_id,
        c.name::TEXT,
        c.logo_url::TEXT,
        (
            COALESCE(ae.hit_rate, 0) * 15
            + COALESCE(ROUND(COALESCE(c.rating, 0) * 5), 0)::INT
            + CASE WHEN COALESCE(c.member_count, 0) >= 25 THEN 10 ELSE 0 END
        )::INT AS match_score,
        CASE
            WHEN COALESCE(ae.hit_rate, 0) > 0 THEN 'Based on events you attended'
            WHEN user_dept IS NOT NULL THEN 'Recommended for active students in your department'
            ELSE 'Active campus club'
        END::TEXT AS recommendation_reason
    FROM public.clubs c
    LEFT JOIN attended_events ae ON ae.club_id = c.id
    WHERE c.status = 'active'
      AND NOT EXISTS (
          SELECT 1
          FROM public.club_memberships cm
          WHERE cm.club_id = c.id
            AND cm.user_id = p_user_id
            AND cm.status IN ('approved', 'active', 'core_member', 'sub_coordinator')
      )
    ORDER BY match_score DESC, c.name ASC
    LIMIT p_limit;
END;
$$;
