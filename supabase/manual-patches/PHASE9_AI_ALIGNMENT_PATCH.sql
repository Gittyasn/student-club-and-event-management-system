-- Phase 9 patch: align AI governance sources and recommendation RPCs

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.ai_governance (
    feature_key TEXT PRIMARY KEY,
    is_enabled BOOLEAN DEFAULT true,
    threshold NUMERIC DEFAULT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_by UUID REFERENCES public.profiles(id)
);

INSERT INTO public.ai_governance (feature_key, is_enabled, description) VALUES
('event_recommendations', true, 'Suggest relevant events based on clubs, attendance, and interest patterns.'),
('club_recommendations', true, 'Suggest clubs that match a student''s department and activity history.'),
('engagement_prediction', true, 'Estimate engagement trends from registrations, attendance, and certificates.'),
('attendance_prediction', true, 'Forecast likely turnout for upcoming events.'),
('smart_scheduling', true, 'Highlight timing conflicts and better scheduling windows.'),
('sentiment_analysis', true, 'Summarize feedback sentiment from students and attendees.'),
('dropout_detection', true, 'Detect students who repeatedly register but do not attend.'),
('automated_summary', true, 'Generate short event and engagement summaries for staff.')
ON CONFLICT (feature_key) DO NOTHING;

ALTER TABLE public.ai_governance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Governance globally readable" ON public.ai_governance;
DROP POLICY IF EXISTS "Admins manage governance" ON public.ai_governance;
DROP POLICY IF EXISTS "Authenticated users can read AI governance" ON public.ai_governance;
DROP POLICY IF EXISTS "Admins can manage AI governance" ON public.ai_governance;

CREATE POLICY "Authenticated users can read AI governance"
ON public.ai_governance
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage AI governance"
ON public.ai_governance
FOR ALL
USING (
    EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
);

CREATE OR REPLACE VIEW public.ai_governance_features AS
SELECT
    feature_key,
    is_enabled,
    description,
    updated_at,
    updated_by
FROM public.ai_governance;

CREATE OR REPLACE FUNCTION public.sync_ai_governance_features_view()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.ai_governance (feature_key, is_enabled, description, updated_at, updated_by)
        VALUES (NEW.feature_key, COALESCE(NEW.is_enabled, true), NEW.description, COALESCE(NEW.updated_at, now()), NEW.updated_by)
        ON CONFLICT (feature_key) DO UPDATE
        SET is_enabled = EXCLUDED.is_enabled,
            description = COALESCE(EXCLUDED.description, public.ai_governance.description),
            updated_at = now(),
            updated_by = EXCLUDED.updated_by;
        RETURN NEW;
    END IF;

    IF TG_OP = 'UPDATE' THEN
        UPDATE public.ai_governance
        SET is_enabled = COALESCE(NEW.is_enabled, public.ai_governance.is_enabled),
            description = COALESCE(NEW.description, public.ai_governance.description),
            updated_at = now(),
            updated_by = NEW.updated_by
        WHERE feature_key = OLD.feature_key;
        RETURN NEW;
    END IF;

    IF TG_OP = 'DELETE' THEN
        DELETE FROM public.ai_governance
        WHERE feature_key = OLD.feature_key;
        RETURN OLD;
    END IF;

    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_ai_governance_features_view ON public.ai_governance_features;
CREATE TRIGGER trg_sync_ai_governance_features_view
    INSTEAD OF INSERT OR UPDATE OR DELETE ON public.ai_governance_features
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_ai_governance_features_view();

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
        c.name,
        c.logo_url,
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
