-- Phase 7: Certificate Storage Setup + Security
-- Safe to rerun.

BEGIN;

-- Ensure the certificates bucket exists and is private.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'certificates',
    'certificates',
    false,
    10485760,
    ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE OR REPLACE FUNCTION public.certificate_storage_event_id(p_name text)
RETURNS uuid
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT CASE
        WHEN split_part(p_name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
            THEN split_part(p_name, '/', 1)::uuid
        ELSE NULL
    END;
$$;

CREATE OR REPLACE FUNCTION public.certificate_storage_user_id(p_name text)
RETURNS uuid
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT CASE
        WHEN split_part(split_part(p_name, '/', 2), '_', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
            THEN split_part(split_part(p_name, '/', 2), '_', 1)::uuid
        ELSE NULL
    END;
$$;

CREATE OR REPLACE FUNCTION public.can_manage_certificate_file(p_name text, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.events e
        JOIN public.profiles p ON p.club_id = e.club_id
        WHERE e.id = public.certificate_storage_event_id(p_name)
          AND p.id = p_user_id
          AND p.role = 'coordinator'
    );
$$;

CREATE OR REPLACE FUNCTION public.can_read_own_certificate_file(p_name text, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public.certificate_storage_user_id(p_name) = p_user_id;
$$;

DROP POLICY IF EXISTS "Certificate files are readable by owners" ON storage.objects;
DROP POLICY IF EXISTS "Certificate files are managed by coordinators" ON storage.objects;
DROP POLICY IF EXISTS "Certificate files are managed by admins" ON storage.objects;
DROP POLICY IF EXISTS "Certificate files insert by coordinators" ON storage.objects;
DROP POLICY IF EXISTS "Certificate files update by coordinators" ON storage.objects;
DROP POLICY IF EXISTS "Certificate files delete by coordinators" ON storage.objects;

CREATE POLICY "Certificate files are readable by owners" ON storage.objects
FOR SELECT TO authenticated
USING (
    bucket_id = 'certificates'
    AND (
        public.check_is_admin_safe(auth.uid())
        OR public.can_manage_certificate_file(name, auth.uid())
        OR public.can_read_own_certificate_file(name, auth.uid())
    )
);

CREATE POLICY "Certificate files insert by coordinators" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'certificates'
    AND (
        public.check_is_admin_safe(auth.uid())
        OR public.can_manage_certificate_file(name, auth.uid())
    )
);

CREATE POLICY "Certificate files update by coordinators" ON storage.objects
FOR UPDATE TO authenticated
USING (
    bucket_id = 'certificates'
    AND (
        public.check_is_admin_safe(auth.uid())
        OR public.can_manage_certificate_file(name, auth.uid())
    )
)
WITH CHECK (
    bucket_id = 'certificates'
    AND (
        public.check_is_admin_safe(auth.uid())
        OR public.can_manage_certificate_file(name, auth.uid())
    )
);

CREATE POLICY "Certificate files delete by coordinators" ON storage.objects
FOR DELETE TO authenticated
USING (
    bucket_id = 'certificates'
    AND (
        public.check_is_admin_safe(auth.uid())
        OR public.can_manage_certificate_file(name, auth.uid())
    )
);

COMMIT;
