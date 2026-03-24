-- ============================================================
-- Migration: Certificate Generation Engine (Enterprise Blueprint)
-- File: 20260301_certificate_module.sql
-- ============================================================

-- 1. Enhance certificates table
ALTER TABLE public.certificates
    ADD COLUMN IF NOT EXISTS cert_type text DEFAULT 'participation'
        CHECK (cert_type IN ('participation', 'winner', 'merit')),
    ADD COLUMN IF NOT EXISTS status text DEFAULT 'valid'
        CHECK (status IN ('valid', 'revoked', 'pending')),
    ADD COLUMN IF NOT EXISTS rank integer,
    ADD COLUMN IF NOT EXISTS score numeric(8,2),
    ADD COLUMN IF NOT EXISTS grade text,
    ADD COLUMN IF NOT EXISTS prize_title text,
    ADD COLUMN IF NOT EXISTS is_locked boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS generated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS generated_at timestamp with time zone DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS revoked_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS revoked_at timestamp with time zone,
    ADD COLUMN IF NOT EXISTS revocation_reason text,
    ADD COLUMN IF NOT EXISTS certificate_number text; -- human-readable like CERT-2026-00001

-- Certificate number unique index
ALTER TABLE public.certificates DROP CONSTRAINT IF EXISTS certificates_event_user_unique;
ALTER TABLE public.certificates ADD CONSTRAINT certificates_event_user_unique UNIQUE (event_id, user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_certificates_number ON public.certificates(certificate_number)
    WHERE certificate_number IS NOT NULL;

-- Rename certificate_url to file_url (support old name too)
ALTER TABLE public.certificates ADD COLUMN IF NOT EXISTS file_url text;

-- 2. Certificate templates table (admin-managed)
CREATE TABLE IF NOT EXISTS public.cert_templates (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    name text NOT NULL,
    cert_type text CHECK (cert_type IN ('participation', 'winner', 'merit', 'all')),
    background_url text,        -- Supabase Storage URL for background image
    logo_url text,
    signature_url text,
    watermark_text text DEFAULT 'OFFICIAL',
    primary_color text DEFAULT '#1a56db',
    accent_color text DEFAULT '#f59e0b',
    font_family text DEFAULT 'Helvetica',
    custom_text text,           -- JSON string for placeholder text blocks
    is_default boolean DEFAULT false,
    created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at timestamp with time zone DEFAULT NOW()
);

ALTER TABLE public.cert_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage templates" ON public.cert_templates;
CREATE POLICY "Admins manage templates" ON public.cert_templates
    FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Anyone can view templates" ON public.cert_templates;
CREATE POLICY "Anyone can view templates" ON public.cert_templates
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Insert a default template record
INSERT INTO public.cert_templates (name, cert_type, is_default, primary_color, accent_color)
VALUES ('Default Template', 'all', true, '#1a56db', '#f59e0b')
ON CONFLICT DO NOTHING;

-- 3. Certificate audit logs
CREATE TABLE IF NOT EXISTS public.certificate_logs (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    certificate_id uuid REFERENCES public.certificates(id) ON DELETE SET NULL,
    event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
    student_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    action text NOT NULL, -- 'generated', 'regenerated', 'revoked', 'locked', 'downloaded', 'verified'
    note text,
    created_at timestamp with time zone DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cert_logs_event ON public.certificate_logs(event_id);
CREATE INDEX IF NOT EXISTS idx_cert_logs_student ON public.certificate_logs(student_id);
ALTER TABLE public.certificate_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view cert logs" ON public.certificate_logs;
CREATE POLICY "Admins can view cert logs" ON public.certificate_logs
    FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Coordinators can view cert logs for their events" ON public.certificate_logs;
CREATE POLICY "Coordinators can view cert logs for their events" ON public.certificate_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.events e
            JOIN public.profiles p ON p.club_id = e.club_id
            WHERE e.id = certificate_logs.event_id AND p.id = auth.uid() AND p.role = 'coordinator'
        )
    );

DROP POLICY IF EXISTS "Roles can insert cert logs" ON public.certificate_logs;
CREATE POLICY "Roles can insert cert logs" ON public.certificate_logs
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','coordinator'))
    );

-- 4. RLS for certificates table
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

-- Drop old policies (if any exist)
DROP POLICY IF EXISTS "Students can view own certificates" ON public.certificates;
DROP POLICY IF EXISTS "Public can verify certificates" ON public.certificates;
DROP POLICY IF EXISTS "Coordinators can manage certificates for their events" ON public.certificates;
DROP POLICY IF EXISTS "Admins have full access to certificates" ON public.certificates;

-- Student: view own
CREATE POLICY "Students can view own certificates" ON public.certificates
    FOR SELECT USING (user_id = auth.uid());

-- Public verify (select-only, limited fields enforced at query level)
CREATE POLICY "Public can verify certificates by id" ON public.certificates
    FOR SELECT USING (true); -- verified via unique cert_id in query; anon access needed for verify page

-- Coordinator: view + manage for their event
CREATE POLICY "Coordinators can manage certificates for their events" ON public.certificates
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.events e
            JOIN public.profiles p ON p.club_id = e.club_id
            WHERE e.id = certificates.event_id AND p.id = auth.uid() AND p.role = 'coordinator'
        )
    );

-- Admin: full control
CREATE POLICY "Admins have full access to certificates" ON public.certificates
    FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- 5. FUNCTION: generate_certificate_number
-- Creates a human-readable serial like CERT-2026-00042
CREATE OR REPLACE FUNCTION public.generate_certificate_number()
RETURNS text AS $$
DECLARE
    v_year text := EXTRACT(YEAR FROM NOW())::text;
    v_count integer;
BEGIN
    SELECT COUNT(*) INTO v_count FROM public.certificates
    WHERE EXTRACT(YEAR FROM generated_at) = EXTRACT(YEAR FROM NOW());
    RETURN 'CERT-' || v_year || '-' || LPAD((v_count + 1)::text, 5, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Done.
