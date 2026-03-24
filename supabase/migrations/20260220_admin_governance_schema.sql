-- Add System Settings and Audit Logs for Admin Governance

-- 1. System Settings Table
CREATE TABLE IF NOT EXISTS public.system_settings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    key_name TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS for System Settings
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Admins can read/write settings. Everyone else can read.
CREATE POLICY "Public can read settings" ON public.system_settings
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage settings" ON public.system_settings
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Seed defaults
INSERT INTO public.system_settings (key_name, value, description)
VALUES 
    ('registration_open', 'true'::jsonb, 'Global toggle to allow new user registrations'),
    ('event_approval_mandatory', 'true'::jsonb, 'Require admin approval for all club events'),
    ('membership_auto_approve', 'false'::jsonb, 'Auto-approve users when they join a club'),
    ('max_event_duration_hours', '72'::jsonb, 'Maximum allowed duration for a single event in hours')
ON CONFLICT (key_name) DO NOTHING;

-- 2. Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    module TEXT NOT NULL,
    details JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for Audit Logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can see audit logs
CREATE POLICY "Admins can view audit logs" ON public.audit_logs
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- System can insert logs (or admins/authenticated users logging actions)
CREATE POLICY "Authenticated users can insert their logs" ON public.audit_logs
    FOR INSERT TO authenticated WITH CHECK (
        user_id = auth.uid() OR 
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Prevent deletion of audit logs entirely
CREATE POLICY "Prevent deletion of audit logs" ON public.audit_logs
    FOR DELETE USING (false);

-- Prevent updates of audit logs
CREATE POLICY "Prevent updates to audit logs" ON public.audit_logs
    FOR UPDATE USING (false);
