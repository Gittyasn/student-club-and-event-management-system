-- Migration: Fix Admin RLS on Profiles Table
-- Problem: Admins cannot read all profiles because the SELECT policy only
--          allows users to see their own row (auth.uid() = id).
-- Solution: Add an admin bypass policy so admins can SELECT all profiles,
--           and also allow admins to UPDATE any profile (for role assignment, status changes, etc.)

-- ─── PROFILES: Admin can read ALL profiles ─────────────────────────────────
DROP POLICY IF EXISTS "Admins can view all profiles." ON public.profiles;
CREATE POLICY "Admins can view all profiles."
  ON public.profiles
  FOR SELECT
  USING (
    -- Own profile (keep existing access)
    auth.uid() = id
    OR
    -- Admin bypass
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
    OR
    -- Coordinators can see profiles of their club members
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'coordinator'
        AND public.profiles.club_id = p.club_id
    )
  );

-- ─── PROFILES: Admin can UPDATE any profile ────────────────────────────────
-- (needed to assign roles, block accounts, assign club_id, etc.)
DROP POLICY IF EXISTS "Admins can update any profile." ON public.profiles;
CREATE POLICY "Admins can update any profile."
  ON public.profiles
  FOR UPDATE
  USING (
    auth.uid() = id
    OR
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  )
  WITH CHECK (
    auth.uid() = id
    OR
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );
