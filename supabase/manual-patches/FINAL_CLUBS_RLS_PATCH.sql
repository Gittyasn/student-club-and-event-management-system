BEGIN;

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

CREATE OR REPLACE FUNCTION public.check_is_coordinator_for_club_safe(p_club_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = p_user_id
      AND role = 'coordinator'
      AND club_id = p_club_id
  );
$$;

ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
    policy_row RECORD;
BEGIN
    FOR policy_row IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'clubs'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.clubs', policy_row.policyname);
    END LOOP;
END $$;

CREATE POLICY "Public can view active visible clubs"
ON public.clubs
FOR SELECT
USING (
  status = 'active'
  AND COALESCE(visibility, true) = true
  AND (
    auth.uid() IS NULL
    OR EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = auth.uid()
        AND role = 'student'
    )
  )
);

CREATE POLICY "Admins can view all clubs"
ON public.clubs
FOR SELECT
USING (
  public.check_is_admin_safe(auth.uid())
);

CREATE POLICY "Coordinators can view assigned club only"
ON public.clubs
FOR SELECT
USING (
  public.check_is_coordinator_for_club_safe(id, auth.uid())
);

CREATE POLICY "Admins can insert any club"
ON public.clubs
FOR INSERT
WITH CHECK (
  public.check_is_admin_safe(auth.uid())
);

CREATE POLICY "Admins can update any club"
ON public.clubs
FOR UPDATE
USING (
  public.check_is_admin_safe(auth.uid())
)
WITH CHECK (
  public.check_is_admin_safe(auth.uid())
);

CREATE POLICY "Admins can delete any club"
ON public.clubs
FOR DELETE
USING (
  public.check_is_admin_safe(auth.uid())
);

CREATE POLICY "Coordinators can update assigned club only"
ON public.clubs
FOR UPDATE
USING (
  public.check_is_coordinator_for_club_safe(id, auth.uid())
)
WITH CHECK (
  public.check_is_coordinator_for_club_safe(id, auth.uid())
);

COMMIT;
