-- ==============================================================================
-- MODULE 18: SECURITY & ROW-LEVEL SECURITY (Deep Implementation Blueprint)
-- Migration Version: 20260306
-- ==============================================================================
-- Covers: Audit log hardening, login tracking, security events, rate limiting,
--         RLS gap closures, security helper functions, protective triggers.
-- ==============================================================================


-- ==============================================================================
-- SECTION 1: AUDIT LOGS SCHEMA UPGRADE
-- Extend the existing audit_logs table to match the Security.jsx expectations
-- and add richer forensic fields.
-- ==============================================================================

ALTER TABLE public.audit_logs
    ADD COLUMN IF NOT EXISTS actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS target_table TEXT,
    ADD COLUMN IF NOT EXISTS target_id UUID,
    ADD COLUMN IF NOT EXISTS old_value JSONB,
    ADD COLUMN IF NOT EXISTS new_value JSONB,
    ADD COLUMN IF NOT EXISTS meta JSONB,
    ADD COLUMN IF NOT EXISTS ip_address TEXT,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create indexes for fast query patterns
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON public.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target ON public.audit_logs(target_table, target_id);

-- IMMUTABLE TRIGGER: Prevent any mutation of audit_logs (tamper-proof)
CREATE OR REPLACE FUNCTION public.prevent_audit_log_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'audit_logs are immutable. Modifications are forbidden.';
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_prevent_audit_log_mutation ON public.audit_logs;
CREATE TRIGGER trg_prevent_audit_log_mutation
    BEFORE UPDATE OR DELETE ON public.audit_logs
    FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_log_mutation();


-- ==============================================================================
-- SECTION 2: LOGIN LOGS TABLE
-- Tracks every authentication attempt — success and failure.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.login_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email TEXT,
    status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'blocked', 'suspicious')),
    ip_address TEXT,
    user_agent TEXT,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    failure_reason TEXT, -- e.g. 'wrong_password', 'account_blocked', 'not_verified'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_login_logs_email ON public.login_logs(email);
CREATE INDEX IF NOT EXISTS idx_login_logs_profile ON public.login_logs(profile_id);
CREATE INDEX IF NOT EXISTS idx_login_logs_status ON public.login_logs(status);
CREATE INDEX IF NOT EXISTS idx_login_logs_created_at ON public.login_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_logs_ip ON public.login_logs(ip_address);

ALTER TABLE public.login_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can SELECT login logs
DROP POLICY IF EXISTS "Admins can view login logs" ON public.login_logs;
CREATE POLICY "Admins can view login logs" ON public.login_logs
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- System / authenticated users insert their own login log
DROP POLICY IF EXISTS "System can insert login logs" ON public.login_logs;
CREATE POLICY "System can insert login logs" ON public.login_logs
    FOR INSERT WITH CHECK (true); -- SECURITY DEFINER functions handle this safely

-- Prevent deletion of login logs
DROP POLICY IF EXISTS "Prevent login log deletion" ON public.login_logs;
CREATE POLICY "Prevent login log deletion" ON public.login_logs
    FOR DELETE USING (false);

-- Prevent updates of login logs
DROP POLICY IF EXISTS "Prevent login log updates" ON public.login_logs;
CREATE POLICY "Prevent login log updates" ON public.login_logs
    FOR UPDATE USING (false);


-- ==============================================================================
-- SECTION 3: SECURITY EVENTS TABLE
-- Platform-wide incident log for suspicious activities.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.security_events (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    event_type TEXT NOT NULL CHECK (event_type IN (
        'rate_limit_hit', 'brute_force_detected', 'account_blocked',
        'suspicious_ip', 'xss_attempt', 'sql_injection_attempt',
        'unauthorized_access', 'data_export', 'privilege_escalation',
        'mass_registration', 'spam_detected', 'certificate_revocation',
        'admin_override', 'emergency_action'
    )),
    severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    target_id UUID,   -- Polymorphic: user_id, event_id, club_id depending on context
    target_table TEXT,
    description TEXT,
    meta JSONB,       -- Additional structured data
    resolved BOOLEAN DEFAULT false,
    resolved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_security_events_type ON public.security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON public.security_events(severity);
CREATE INDEX IF NOT EXISTS idx_security_events_actor ON public.security_events(actor_id);
CREATE INDEX IF NOT EXISTS idx_security_events_created ON public.security_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_resolved ON public.security_events(resolved);

ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage security events" ON public.security_events;
CREATE POLICY "Admins can manage security events" ON public.security_events
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- System functions can insert security events
DROP POLICY IF EXISTS "System can insert security events" ON public.security_events;
CREATE POLICY "System can insert security events" ON public.security_events
    FOR INSERT WITH CHECK (true); -- SECURITY DEFINER handles authz


-- ==============================================================================
-- SECTION 4: RATE LIMIT TRACKER TABLE
-- Per-user sliding window counters to detect and prevent abuse.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.rate_limit_tracker (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    ip_address TEXT,
    action TEXT NOT NULL, -- e.g. 'login', 'register_event', 'send_message', 'submit_feedback'
    window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    hit_count INTEGER DEFAULT 1,
    blocked_until TIMESTAMP WITH TIME ZONE,
    UNIQUE (user_id, action, window_start)
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_user_action ON public.rate_limit_tracker(user_id, action);
CREATE INDEX IF NOT EXISTS idx_rate_limit_window ON public.rate_limit_tracker(window_start);
CREATE INDEX IF NOT EXISTS idx_rate_limit_ip ON public.rate_limit_tracker(ip_address, action);

ALTER TABLE public.rate_limit_tracker ENABLE ROW LEVEL SECURITY;

-- Admins can view all rate limit data
DROP POLICY IF EXISTS "Admins can view rate limit data" ON public.rate_limit_tracker;
CREATE POLICY "Admins can view rate limit data" ON public.rate_limit_tracker
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- System functions handle inserts/updates
DROP POLICY IF EXISTS "System manages rate limit entries" ON public.rate_limit_tracker;
CREATE POLICY "System manages rate limit entries" ON public.rate_limit_tracker
    FOR ALL WITH CHECK (true);


-- ==============================================================================
-- SECTION 5: SECURITY HELPER FUNCTIONS
-- Reusable SECURITY DEFINER functions for inline role checks and security ops.
-- ==============================================================================

-- 5a. is_admin() — Clean boolean role check
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 5b. is_coordinator() — Clean boolean role check
CREATE OR REPLACE FUNCTION public.is_coordinator()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'coordinator'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 5c. record_login_attempt() — Writes to login_logs safely
CREATE OR REPLACE FUNCTION public.record_login_attempt(
    p_email TEXT,
    p_status TEXT,
    p_profile_id UUID DEFAULT NULL,
    p_ip_address TEXT DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_failure_reason TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.login_logs (
        email, status, profile_id, ip_address, user_agent, failure_reason
    ) VALUES (
        p_email, p_status, p_profile_id, p_ip_address, p_user_agent, p_failure_reason
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5d. log_security_event() — Writes to security_events safely
CREATE OR REPLACE FUNCTION public.log_security_event(
    p_event_type TEXT,
    p_severity TEXT DEFAULT 'medium',
    p_actor_id UUID DEFAULT NULL,
    p_target_id UUID DEFAULT NULL,
    p_target_table TEXT DEFAULT NULL,
    p_description TEXT DEFAULT NULL,
    p_meta JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_id UUID;
BEGIN
    INSERT INTO public.security_events (
        event_type, severity, actor_id, target_id, target_table, description, meta
    ) VALUES (
        p_event_type, p_severity, p_actor_id, p_target_id, p_target_table, p_description, p_meta
    ) RETURNING id INTO v_id;
    RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5e. check_rate_limit() — Returns true if user is within limit, false if exceeded
CREATE OR REPLACE FUNCTION public.check_rate_limit(
    p_user_id UUID,
    p_action TEXT,
    p_limit INTEGER DEFAULT 10,
    p_window_seconds INTEGER DEFAULT 3600
)
RETURNS BOOLEAN AS $$
DECLARE
    v_count INTEGER;
    v_window_start TIMESTAMP WITH TIME ZONE;
BEGIN
    v_window_start := NOW() - (p_window_seconds || ' seconds')::interval;

    SELECT COALESCE(SUM(hit_count), 0) INTO v_count
    FROM public.rate_limit_tracker
    WHERE user_id = p_user_id
      AND action = p_action
      AND window_start >= v_window_start;

    IF v_count >= p_limit THEN
        PERFORM public.log_security_event(
            'rate_limit_hit', 'medium', p_user_id, p_user_id, 'profiles',
            format('Rate limit exceeded for action: %s', p_action),
            jsonb_build_object('action', p_action, 'count', v_count, 'limit', p_limit)
        );
        RETURN false;
    END IF;

    -- Increment counter (upsert)
    INSERT INTO public.rate_limit_tracker (user_id, action, window_start, hit_count)
    VALUES (p_user_id, p_action, date_trunc('hour', NOW()), 1)
    ON CONFLICT (user_id, action, window_start)
    DO UPDATE SET hit_count = rate_limit_tracker.hit_count + 1;

    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5f. block_user() — Admin-only function to block a user account
CREATE OR REPLACE FUNCTION public.block_user(
    p_target_id UUID,
    p_reason TEXT DEFAULT 'Security policy violation'
)
RETURNS VOID AS $$
BEGIN
    -- Only admins can call this
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Only admins can block users.';
    END IF;

    -- Update account status
    UPDATE public.profiles
    SET account_status = 'blocked'
    WHERE id = p_target_id;

    -- Write audit log
    INSERT INTO public.audit_logs (
        actor_id, user_id, action, module, target_table, target_id,
        meta, created_at
    ) VALUES (
        auth.uid(), auth.uid(), 'block_user', 'Security', 'profiles', p_target_id,
        jsonb_build_object('reason', p_reason, 'blocked_by', auth.uid()),
        NOW()
    );

    -- Write security event
    PERFORM public.log_security_event(
        'account_blocked', 'high', auth.uid(), p_target_id, 'profiles',
        format('User blocked: %s', p_reason),
        jsonb_build_object('reason', p_reason)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5g. resolve_security_event() — Admin marks an incident as resolved
CREATE OR REPLACE FUNCTION public.resolve_security_event(p_event_id UUID)
RETURNS VOID AS $$
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Only admins can resolve security events.';
    END IF;

    UPDATE public.security_events
    SET resolved = true, resolved_by = auth.uid(), resolved_at = NOW()
    WHERE id = p_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ==============================================================================
-- SECTION 6: PROTECTIVE DATABASE TRIGGERS
-- ==============================================================================

-- 6a. Prevent editing locked results (non-admin)
CREATE OR REPLACE FUNCTION public.prevent_locked_result_edit()
RETURNS TRIGGER AS $$
DECLARE
    v_event_id uuid;
    v_locked boolean;
BEGIN
    v_event_id := COALESCE(NEW.event_id, OLD.event_id);

    IF public.is_admin_user(auth.uid()) THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    SELECT COALESCE(results_locked, false)
    INTO v_locked
    FROM public.events
    WHERE id = v_event_id;

    IF v_locked OR OLD.status = 'locked' THEN
        RAISE EXCEPTION 'Results are locked and cannot be modified.';
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_prevent_locked_result_edit ON public.results;
CREATE TRIGGER trg_prevent_locked_result_edit
    BEFORE UPDATE OR DELETE ON public.results
    FOR EACH ROW EXECUTE FUNCTION public.prevent_locked_result_edit();

-- 6b. Message content sanitizer — Strip dangerous HTML/script tags from chat messages
CREATE OR REPLACE FUNCTION public.sanitize_message_content()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.content IS NOT NULL THEN
        -- Remove <script> tags and most common XSS vectors
        NEW.content := regexp_replace(NEW.content, '<script[^>]*>.*?</script>', '', 'gi');
        NEW.content := regexp_replace(NEW.content, '<[^>]*on\w+\s*=\s*[^>]*>', '', 'gi');
        NEW.content := regexp_replace(NEW.content, 'javascript\s*:', '', 'gi');
        NEW.content := regexp_replace(NEW.content, 'vbscript\s*:', '', 'gi');
        -- Limit message length to 4000 characters
        IF length(NEW.content) > 4000 THEN
            NEW.content := substring(NEW.content FROM 1 FOR 4000);
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sanitize_message_content ON public.messages;
CREATE TRIGGER trg_sanitize_message_content
    BEFORE INSERT OR UPDATE ON public.messages
    FOR EACH ROW EXECUTE FUNCTION public.sanitize_message_content();

-- 6c. Auto-log profile changes (for audit trail)
CREATE OR REPLACE FUNCTION public.log_profile_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.role IS DISTINCT FROM NEW.role
       OR OLD.account_status IS DISTINCT FROM NEW.account_status THEN
        INSERT INTO public.audit_logs (
            actor_id, user_id, action, module, target_table, target_id,
            old_value, new_value, created_at
        ) VALUES (
            auth.uid(), auth.uid(), 'profile_update', 'Security', 'profiles', NEW.id,
            jsonb_build_object('role', OLD.role, 'account_status', OLD.account_status),
            jsonb_build_object('role', NEW.role, 'account_status', NEW.account_status),
            NOW()
        );
        -- Log role escalation as a security event
        IF OLD.role IS DISTINCT FROM NEW.role THEN
            PERFORM public.log_security_event(
                'privilege_escalation', 'critical', auth.uid(), NEW.id, 'profiles',
                format('Role changed from %s to %s', OLD.role, NEW.role),
                jsonb_build_object('from_role', OLD.role, 'to_role', NEW.role)
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_log_profile_changes ON public.profiles;
CREATE TRIGGER trg_log_profile_changes
    AFTER UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.log_profile_changes();


-- ==============================================================================
-- SECTION 7: RLS GAP CLOSURES
-- Harden existing tables that had partial or missing policies.
-- ==============================================================================

-- 7a. PROFILES TABLE — Strengthen access control
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_admin_user(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = p_user_id
          AND p.role = 'admin'
    );
$$;

DROP POLICY IF EXISTS "Students can view and update own profile" ON public.profiles;
CREATE POLICY "Students can view and update own profile" ON public.profiles
    FOR ALL USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Authenticated users can view basic profile info" ON public.profiles;
CREATE POLICY "Authenticated users can view basic profile info" ON public.profiles
    FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Admins have full profile access" ON public.profiles;
CREATE POLICY "Admins have full profile access" ON public.profiles
    FOR ALL USING (
        public.is_admin_user(auth.uid())
    );

-- 7b. EVENTS TABLE — Harden student-visible events
DROP POLICY IF EXISTS "Students can browse approved events only" ON public.events;
CREATE POLICY "Students can browse approved events only" ON public.events
    FOR SELECT USING (
        -- Students: only approved events
        (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'student')
         AND approval_status = 'approved'
         AND status NOT IN ('archived', 'cancelled'))
        -- Coordinators: their club's events
        OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'coordinator' AND p.club_id = events.club_id
        )
        -- Admins: all
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
        -- Public route (unauthenticated preview)
        OR (approval_status = 'approved' AND visibility = 'public')
    );

-- 7c. AI GOVERNANCE TABLE — Admin only
ALTER TABLE public.ai_governance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage AI governance" ON public.ai_governance;
CREATE POLICY "Admins can manage AI governance" ON public.ai_governance
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

DROP POLICY IF EXISTS "Authenticated users can read AI governance" ON public.ai_governance;
CREATE POLICY "Authenticated users can read AI governance" ON public.ai_governance
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- 7d. AI INSIGHTS CACHE — Role-based access
ALTER TABLE public.ai_insights_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage AI insights cache" ON public.ai_insights_cache;
CREATE POLICY "Admins manage AI insights cache" ON public.ai_insights_cache
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

DROP POLICY IF EXISTS "Authenticated users can read AI cache" ON public.ai_insights_cache;
CREATE POLICY "Authenticated users can read AI cache" ON public.ai_insights_cache
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- 7e. REGISTRATIONS — Ensure students cannot inflate their user_id on insert
DROP POLICY IF EXISTS "Students can only register themselves" ON public.registrations;
CREATE POLICY "Students can only register themselves" ON public.registrations
    FOR INSERT WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND account_status = 'active')
    );

-- 7f. SYSTEM_SETTINGS — Prevent non-admin writes
DROP POLICY IF EXISTS "Only admins can modify system settings" ON public.system_settings;
CREATE POLICY "Only admins can modify system settings" ON public.system_settings
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );


-- ==============================================================================
-- SECTION 8: SECURITY MONITORING VIEWS (Read-only, admin-accessible)
-- ==============================================================================

-- 8a. Failed logins in last 24 hours
CREATE OR REPLACE VIEW public.v_failed_logins_24h AS
    SELECT
        email,
        ip_address,
        COUNT(*) AS attempt_count,
        MAX(created_at) AS last_attempt,
        bool_or(status = 'blocked') AS is_blocked
    FROM public.login_logs
    WHERE status IN ('failed', 'blocked')
      AND created_at > NOW() - INTERVAL '24 hours'
    GROUP BY email, ip_address
    ORDER BY attempt_count DESC;

-- 8b. Active security incidents (unresolved)
CREATE OR REPLACE VIEW public.v_active_security_incidents AS
    SELECT
        se.id,
        se.event_type,
        se.severity,
        se.description,
        se.created_at,
        p.full_name AS actor_name,
        p.email AS actor_email
    FROM public.security_events se
    LEFT JOIN public.profiles p ON p.id = se.actor_id
    WHERE se.resolved = false
    ORDER BY
        CASE se.severity
            WHEN 'critical' THEN 1
            WHEN 'high' THEN 2
            WHEN 'medium' THEN 3
            WHEN 'low' THEN 4
        END,
        se.created_at DESC;

-- 8c. Security KPIs summary
CREATE OR REPLACE VIEW public.v_security_kpis AS
    SELECT
        (SELECT COUNT(*) FROM public.login_logs WHERE status = 'failed' AND created_at > NOW() - INTERVAL '24 hours') AS failed_logins_24h,
        (SELECT COUNT(*) FROM public.profiles WHERE account_status = 'blocked') AS blocked_users,
        (SELECT COUNT(*) FROM public.security_events WHERE resolved = false) AS active_incidents,
        (SELECT COUNT(*) FROM public.security_events WHERE severity = 'critical' AND resolved = false) AS critical_incidents,
        (SELECT COUNT(*) FROM public.certificates WHERE status = 'revoked') AS revoked_certificates,
        (SELECT COUNT(*) FROM public.audit_logs WHERE created_at > NOW() - INTERVAL '24 hours') AS audit_actions_24h;


-- ==============================================================================
-- SECTION 9: SEED DEFAULT AI GOVERNANCE FEATURES (if not already present)
-- ==============================================================================

INSERT INTO public.ai_governance (feature_key, is_enabled, description) VALUES
    ('event_recommendations',  true,  'AI-powered event recommendations for students based on interests'),
    ('club_recommendations',   true,  'Smart club suggestions based on student department and history'),
    ('engagement_scoring',     true,  'Calculate and display student engagement score and risk level'),
    ('attendance_prediction',  true,  'Forecast event attendance based on historical patterns'),
    ('feedback_sentiment',     true,  'NLP sentiment analysis on event feedback comments'),
    ('dropout_detection',      true,  'Identify at-risk students based on engagement decline'),
    ('smart_leaderboards',     true,  'AI-weighted leaderboards accounting for activity diversity'),
    ('event_summary',          true,  'Automated event debrief generation using OpenAI')
ON CONFLICT (feature_key) DO NOTHING;


-- ==============================================================================
-- DONE: Module 18 — Security & RLS Migration Complete
-- ==============================================================================
