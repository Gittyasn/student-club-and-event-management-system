BEGIN;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.check_is_admin_safe(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = p_user_id
      AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.check_can_view_profile_safe(p_target_profile_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles target_profile
    WHERE target_profile.id = p_target_profile_id
      AND (
        target_profile.id = p_user_id
        OR public.check_is_admin_safe(p_user_id)
        OR EXISTS (
          SELECT 1
          FROM public.profiles requester
          WHERE requester.id = p_user_id
            AND requester.role = 'coordinator'
            AND requester.club_id IS NOT NULL
            AND requester.club_id = target_profile.club_id
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.guard_profile_sensitive_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF public.check_is_admin_safe(auth.uid()) THEN
        RETURN NEW;
    END IF;

    IF TG_OP = 'UPDATE' THEN
        IF auth.uid() IS DISTINCT FROM OLD.id THEN
            RAISE EXCEPTION 'You cannot update another user''s profile.';
        END IF;

        IF NEW.role IS DISTINCT FROM OLD.role THEN
            RAISE EXCEPTION 'Only admins can change role.';
        END IF;

        IF NEW.account_status IS DISTINCT FROM OLD.account_status THEN
            RAISE EXCEPTION 'Only admins can change account status.';
        END IF;

        IF NEW.club_id IS DISTINCT FROM OLD.club_id THEN
            RAISE EXCEPTION 'Only admins can change club assignment.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_profile_sensitive_fields ON public.profiles;
CREATE TRIGGER guard_profile_sensitive_fields
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.guard_profile_sensitive_fields();

DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles." ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile." ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for users to create their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view allowed profiles" ON public.profiles;
DROP POLICY IF EXISTS "Phase11 profiles select" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert safe own profile" ON public.profiles;
DROP POLICY IF EXISTS "Phase11 profiles insert self" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert any profile" ON public.profiles;
DROP POLICY IF EXISTS "Phase11 profiles insert admin" ON public.profiles;
DROP POLICY IF EXISTS "Phase11 profiles update" ON public.profiles;

CREATE POLICY "Phase11 profiles select"
ON public.profiles
FOR SELECT
USING (
    auth.uid() IS NOT NULL
    AND public.check_can_view_profile_safe(id, auth.uid())
);

CREATE POLICY "Phase11 profiles update"
ON public.profiles
FOR UPDATE
USING (
    auth.uid() = id
    OR public.check_is_admin_safe(auth.uid())
)
WITH CHECK (
    auth.uid() = id
    OR public.check_is_admin_safe(auth.uid())
);

CREATE POLICY "Phase11 profiles insert self"
ON public.profiles
FOR INSERT
WITH CHECK (
    auth.uid() = id
    AND COALESCE(role, 'student') = 'student'
    AND COALESCE(account_status, 'active') = 'active'
    AND club_id IS NULL
);

CREATE POLICY "Phase11 profiles insert admin"
ON public.profiles
FOR INSERT
WITH CHECK (
    public.check_is_admin_safe(auth.uid())
);

COMMIT;
