-- Migration: 20260305_ai_module_schema.sql
-- Description: Core predictive engine and AI governance schema for Module 17

-- 1. AI Governance Table (Admin Controlled AI Features)
CREATE TABLE IF NOT EXISTS public.ai_governance (
    feature_key TEXT PRIMARY KEY,
    is_enabled BOOLEAN DEFAULT true,
    threshold NUMERIC DEFAULT NULL, -- Optional threshold config (e.g. risk score cutoff)
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_by UUID REFERENCES public.profiles(id)
);

-- Insert default features
INSERT INTO public.ai_governance (feature_key, is_enabled, description) VALUES
('event_recommendations', true, 'Smart event recommendations based on past user behavior.'),
('club_recommendations', true, 'Intelligent club suggestions mapped to departments and history.'),
('engagement_prediction', true, 'Calculates dynamic user activity scores to flag high-engagers and dropouts.'),
('attendance_prediction', true, 'Forecasts event capacity and show-up percentages based on history.'),
('smart_scheduling', true, 'Suggests optimal times bypassing overlapping demand.'),
('sentiment_analysis', true, 'OpenAI driven extraction of feedback positivity and pain points.'),
('dropout_detection', true, 'Triggers warnings if a student registers but misses consecutive events.'),
('automated_summary', true, 'OpenAI driven post-event performance debrief.')
ON CONFLICT (feature_key) DO NOTHING;

-- 2. AI Insights Cache Table (Saves API tokens by caching LLM generations)
CREATE TABLE IF NOT EXISTS public.ai_insights_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cache_type TEXT NOT NULL, -- 'sentiment', 'summary', 'scheduling'
    reference_id UUID,        -- could be event_id, club_id
    payload JSONB NOT NULL,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    expires_at TIMESTAMP WITH TIME ZONE -- Optional TTL
);
CREATE INDEX IF NOT EXISTS idx_ai_cache_ref ON public.ai_insights_cache(cache_type, reference_id);

-- RLS
ALTER TABLE public.ai_governance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_insights_cache ENABLE ROW LEVEL SECURITY;

-- Admins manage governance, everyone reads
CREATE POLICY "Governance globally readable" ON public.ai_governance FOR SELECT USING (true);
CREATE POLICY "Admins manage governance" ON public.ai_governance FOR ALL USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

-- Cache is globally readable, coordinators/admins update
CREATE POLICY "Cache readable" ON public.ai_insights_cache FOR SELECT USING (true);
CREATE POLICY "Cache writable" ON public.ai_insights_cache FOR ALL USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'coordinator')
);

-- 3. Predictive RPC Engines

-- RPC: Get Student Engagement Score
-- Returns a 0-100 score + classification
CREATE OR REPLACE FUNCTION public.get_student_engagement_score(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
    total_regs INT;
    total_attended INT;
    attendance_rate NUMERIC;
    feedback_count INT;
    score NUMERIC;
    classification TEXT;
BEGIN
    SELECT count(*) INTO total_regs FROM public.registrations WHERE user_id = p_user_id;
    
    SELECT count(*) INTO total_attended 
    FROM public.attendance_records 
    WHERE user_id = p_user_id AND status IN ('present', 'late');

    SELECT count(*) INTO feedback_count FROM public.feedback WHERE user_id = p_user_id;

    -- Base Logic (Scale of 100)
    -- Attendance Rate (60% weight) -> (Attended / Regs)
    attendance_rate := COALESCE(NULLIF(total_attended::NUMERIC / NULLIF(total_regs, 0), 0) * 100, 0);
    
    -- Volume metric (40% weight mapping up to 10 events registered/feedback given)
    score := (attendance_rate * 0.6) + (LEAST(total_regs, 10) * 2) + (LEAST(feedback_count, 10) * 2);
    
    score := LEAST(score, 100); -- Cap at 100
    
    IF score >= 75 THEN classification := 'Highly Engaged';
    ELSIF score >= 40 THEN classification := 'Moderate';
    ELSIF score > 0 THEN classification := 'At Risk';
    ELSE classification := 'Inactive';
    END IF;

    RETURN json_build_object(
        'score', score,
        'classification', classification,
        'attendance_rate', attendance_rate,
        'total_registrations', total_regs
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- RPC: Event Recommendations
-- Smart sorting of upcoming events using category matching and club affiliation
CREATE OR REPLACE FUNCTION public.get_event_recommendations(p_user_id UUID, p_limit INT DEFAULT 6)
RETURNS TABLE (
    event_id UUID,
    title TEXT,
    banner_url TEXT,
    start_time TIMESTAMP WITH TIME ZONE,
    match_score INT,
    recommendation_reason TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH UserClubs AS (
        SELECT club_id FROM public.club_memberships 
        WHERE user_id = p_user_id AND status = 'approved'
    ),
    UserCategories AS (
        SELECT e.category_id, COUNT(*) as cat_weight
        FROM public.attendance_records a
        JOIN public.events e ON a.event_id = e.id
        WHERE a.user_id = p_user_id
        GROUP BY e.category_id
    )
    SELECT 
        e.id,
        e.title,
        e.banner_url,
        e.start_time,
        -- Calculate Match Score
        COALESCE(uc.cat_weight, 0) * 10 + 
        (CASE WHEN cl.club_id IS NOT NULL THEN 20 ELSE 0 END) +
        (CASE WHEN e.capacity > 0 AND (SELECT count(*) FROM public.registrations r WHERE r.event_id = e.id) >= (e.capacity * 0.8) THEN 5 ELSE 0 END) AS match_score,
        -- Reason
        CASE 
            WHEN cl.club_id IS NOT NULL THEN 'From your clubs'
            WHEN uc.cat_weight > 0 THEN 'Based on past categories'
            ELSE 'Trending'
        END AS recommendation_reason
    FROM public.events e
    LEFT JOIN UserCategories uc ON e.category_id = uc.category_id
    LEFT JOIN UserClubs cl ON e.club_id = cl.club_id
    WHERE e.status = 'approved' 
      AND e.start_time > NOW()
      AND e.id NOT IN (SELECT event_id FROM public.registrations WHERE user_id = p_user_id) -- Not already registered
    ORDER BY match_score DESC, e.start_time ASC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- RPC: Club Recommendations
CREATE OR REPLACE FUNCTION public.get_club_recommendations(p_user_id UUID, p_limit INT DEFAULT 4)
RETURNS TABLE (
    club_id UUID,
    name TEXT,
    logo_url TEXT,
    match_score INT,
    recommendation_reason TEXT
) AS $$
DECLARE
    user_dept TEXT;
BEGIN
    SELECT department INTO user_dept FROM public.profiles WHERE id = p_user_id;

    RETURN QUERY
    WITH AttendedEvents AS (
        SELECT e.club_id, COUNT(*) as hit_rate
        FROM public.attendance_records a
        JOIN public.events e ON a.event_id = e.id
        WHERE a.user_id = p_user_id
        GROUP BY e.club_id
    )
    SELECT 
        c.id,
        c.name,
        c.logo_url,
        COALESCE(ae.hit_rate, 0) * 15 + 
        (CASE WHEN c.department = user_dept THEN 25 ELSE 0 END) AS match_score,
        CASE 
            WHEN c.department = user_dept THEN 'Matches your department'
            WHEN ae.hit_rate > 0 THEN 'Based on events attended'
            ELSE 'Popular on campus'
        END AS recommendation_reason
    FROM public.clubs c
    LEFT JOIN AttendedEvents ae ON c.id = ae.club_id
    WHERE c.status = 'active'
      AND c.id NOT IN (SELECT cm.club_id FROM public.club_memberships cm WHERE cm.user_id = p_user_id)
    ORDER BY match_score DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- RPC: Attendance Prediction Model
-- Looks at historical turnout for the club and applies it to current registrations
CREATE OR REPLACE FUNCTION public.predict_event_attendance(p_event_id UUID)
RETURNS JSON AS $$
DECLARE
    v_club_id UUID;
    total_reg INT;
    hist_turnout_rate NUMERIC;
    predicted_count INT;
BEGIN
    -- Get event context
    SELECT club_id INTO v_club_id FROM public.events WHERE id = p_event_id;
    SELECT count(*) INTO total_reg FROM public.registrations WHERE event_id = p_event_id AND status = 'registered';

    -- Historical turnout rate for the club across all PAST events
    SELECT COALESCE(
        (COUNT(NULLIF(a.status IN ('present', 'late'), false))::NUMERIC / NULLIF(COUNT(a.id), 0)), 
        0.75 -- Default 75% baseline if no history exists
    ) INTO hist_turnout_rate
    FROM public.events e
    JOIN public.attendance_records a ON e.id = a.event_id
    WHERE e.club_id = v_club_id AND e.start_time < NOW();

    predicted_count := ROUND(total_reg * hist_turnout_rate);

    RETURN json_build_object(
        'total_registrations', total_reg,
        'historical_turnout_rate', ROUND(hist_turnout_rate * 100),
        'predicted_attendance', predicted_count,
        'predicted_no_shows', total_reg - predicted_count
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
