-- Phase 2 membership compatibility patch
-- Safe to run in Supabase SQL Editor.

BEGIN;

-- Expand membership lifecycle/status support expected by the frontend.
ALTER TABLE public.club_memberships
    DROP CONSTRAINT IF EXISTS club_memberships_status_check;

ALTER TABLE public.club_memberships
    ADD COLUMN IF NOT EXISTS role text CHECK (role IN ('member', 'core_member', 'sub_coordinator', 'volunteer')) DEFAULT 'member',
    ADD COLUMN IF NOT EXISTS removed_at timestamptz,
    ADD COLUMN IF NOT EXISTS removal_reason text,
    ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT timezone('utc'::text, now());

ALTER TABLE public.club_memberships
    ADD CONSTRAINT club_memberships_status_check
    CHECK (status IN ('pending', 'approved', 'rejected', 'removed', 'left', 'suspended'));

-- Add missing club configuration columns used in the app.
ALTER TABLE public.clubs
    ADD COLUMN IF NOT EXISTS max_members int,
    ADD COLUMN IF NOT EXISTS department_restriction text[],
    ADD COLUMN IF NOT EXISTS year_restriction int[],
    ADD COLUMN IF NOT EXISTS auto_approve_memberships boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS require_questionnaire boolean DEFAULT false;

-- Allow students to leave their own club memberships.
DROP POLICY IF EXISTS "Students can leave a club." ON public.club_memberships;
CREATE POLICY "Students can leave a club."
ON public.club_memberships
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id AND status = 'left');

-- Allow students to re-request membership after leaving or being rejected.
DROP POLICY IF EXISTS "Students can re-request membership" ON public.club_memberships;
CREATE POLICY "Students can re-request membership"
ON public.club_memberships
FOR UPDATE
USING (
    auth.uid() = user_id
    AND status IN ('left', 'rejected', 'removed', 'suspended')
)
WITH CHECK (
    auth.uid() = user_id
    AND status = 'pending'
);

-- Ensure coordinators can approve/reject/remove memberships for their own club.
DROP POLICY IF EXISTS "Coordinators can manage memberships for their club" ON public.club_memberships;
DROP POLICY IF EXISTS "Coordinators can manage their club memberships." ON public.club_memberships;
DROP POLICY IF EXISTS "Coordinators can update memberships for their club" ON public.club_memberships;
CREATE POLICY "Coordinators can manage memberships for their club"
ON public.club_memberships
FOR UPDATE
USING (
    EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.role = 'coordinator'
          AND p.club_id = public.club_memberships.club_id
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.role = 'coordinator'
          AND p.club_id = public.club_memberships.club_id
    )
);

-- Ensure admins can update and delete memberships globally.
DROP POLICY IF EXISTS "Admins can manage memberships" ON public.club_memberships;
DROP POLICY IF EXISTS "Admins can do everything on memberships" ON public.club_memberships;
DROP POLICY IF EXISTS "Admins have full access to memberships." ON public.club_memberships;
CREATE POLICY "Admins can manage memberships"
ON public.club_memberships
FOR ALL
USING (
    EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.role = 'admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.role = 'admin'
    )
);

DROP POLICY IF EXISTS "Admins can delete memberships" ON public.club_memberships;
CREATE POLICY "Admins can delete memberships"
ON public.club_memberships
FOR DELETE
USING (
    EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.role = 'admin'
    )
);

COMMIT;
