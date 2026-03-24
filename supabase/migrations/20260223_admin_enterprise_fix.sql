-- Migration: Admin Enterprise Schema Consolidation
-- Date: Feb 23, 2026
-- Description: Unifies audit_logs and system_settings schemas for consistency and enterprise-grade tracking.

-- 1. UNIFY SYSTEM SETTINGS
-- Frontend expects { key, value } structure
CREATE TABLE IF NOT EXISTS public.temp_system_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES public.profiles(id)
);

-- Migrate existing settings if the old table exists
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'system_settings') THEN
        -- Check if it has key_name or key
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'system_settings' AND column_name = 'key_name') THEN
            INSERT INTO public.temp_system_settings (key, value, description)
            SELECT key_name, value::text, description FROM public.system_settings
            ON CONFLICT (key) DO NOTHING;
        ELSE
            INSERT INTO public.temp_system_settings (key, value, description)
            SELECT key, value, description FROM public.system_settings
            ON CONFLICT (key) DO NOTHING;
        END IF;
    END IF;
END $$;

DROP TABLE IF EXISTS public.system_settings CASCADE;
ALTER TABLE public.temp_system_settings RENAME TO system_settings;

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read system settings" ON public.system_settings
    FOR SELECT USING (true);

CREATE POLICY "Only admins can manage settings" ON public.system_settings
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Seed/Ensure defaults
INSERT INTO public.system_settings (key, value, description)
VALUES 
    ('allow_student_registrations', 'true', 'Allow students to register for events platform-wide.'),
    ('require_event_approval', 'true', 'All events must be approved by admin before going live.'),
    ('allow_new_signups', 'true', 'Allow new users to register on the platform.'),
    ('maintenance_mode', 'false', 'Put the platform in read-only maintenance mode.')
ON CONFLICT (key) DO UPDATE SET description = EXCLUDED.description;


-- 2. UNIFY AUDIT LOGS
-- Frontend (Security.jsx) expects: id, action, target_table, target_id, meta, created_at, actor_id
CREATE TABLE IF NOT EXISTS public.temp_audit_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    target_table TEXT,
    target_id UUID,
    meta JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Migrate old logs if possible (mapping user_id/actor_id)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
        -- The 20260221 version had user_id (profiles) and entity_type/entity_id
        INSERT INTO public.temp_audit_logs (actor_id, action, target_table, target_id, meta, created_at)
        SELECT user_id, action, entity_type, entity_id, new_values, created_at FROM public.audit_logs
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

DROP TABLE IF EXISTS public.audit_logs CASCADE;
ALTER TABLE public.temp_audit_logs RENAME TO audit_logs;

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all audit logs" ON public.audit_logs
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Authenticated users can create logs" ON public.audit_logs
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON public.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);

-- 3. ENSURE CLUB/EVENT STATUSES
-- Just in case they weren't fully enforced
ALTER TABLE public.clubs DROP CONSTRAINT IF EXISTS clubs_status_check;
ALTER TABLE public.clubs ADD CONSTRAINT clubs_status_check CHECK (status IN ('active', 'inactive', 'suspended'));

ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_approval_status_check;
ALTER TABLE public.events ADD CONSTRAINT events_approval_status_check CHECK (approval_status IN ('pending', 'approved', 'rejected', 'draft'));
