-- ============================================================
-- FIX: Missing RLS Policies for Admin User Management
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. Allow admins to UPDATE any user profile (role, club_id, account_status, etc.)
--    Previously missing: only "Users can update own profile" existed.
DROP POLICY IF EXISTS "Admins can update any profile." ON public.profiles;
CREATE POLICY "Admins can update any profile."
  ON public.profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 2. Allow admins to view ALL registrations (needed for User Management count joins)
DROP POLICY IF EXISTS "Admins can view all registrations." ON public.registrations;
CREATE POLICY "Admins can view all registrations."
  ON public.registrations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 3. Allow admins to delete any user profile (for User Management block/delete)
DROP POLICY IF EXISTS "Admins can delete any profile." ON public.profiles;
CREATE POLICY "Admins can delete any profile."
  ON public.profiles
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 4. Allow admins to view ALL club_memberships (fixes User Management engagement column)
DROP POLICY IF EXISTS "Admins can view all club memberships." ON public.club_memberships;
CREATE POLICY "Admins can view all club memberships."
  ON public.club_memberships
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
