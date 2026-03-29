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
    public.is_admin_user(auth.uid())
    OR
    -- Coordinators assigned directly on a club can see member profiles tied to that club.
    EXISTS (
      SELECT 1
      FROM public.clubs c
      JOIN public.club_memberships cm ON cm.club_id = c.id
      WHERE c.coordinator_id = auth.uid()
        AND cm.user_id = public.profiles.id
        AND cm.status IN ('pending', 'approved', 'suspended')
    )
    OR
    -- Approved sub-coordinators can see profiles for memberships in their delegated club.
    EXISTS (
      SELECT 1
      FROM public.club_memberships actor_cm
      JOIN public.club_memberships target_cm ON target_cm.club_id = actor_cm.club_id
      WHERE actor_cm.user_id = auth.uid()
        AND actor_cm.role = 'sub_coordinator'
        AND actor_cm.status = 'approved'
        AND target_cm.user_id = public.profiles.id
        AND target_cm.status IN ('pending', 'approved', 'suspended')
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
    public.is_admin_user(auth.uid())
  )
  WITH CHECK (
    auth.uid() = id
    OR
    public.is_admin_user(auth.uid())
  );
