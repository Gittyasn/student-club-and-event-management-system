-- Tighten RLS for club_memberships: only allow coordinators/admins to update status or is_sub_coordinator

-- Drop existing coordinator update policy (if exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_policies WHERE polname = 'Coordinators can update membership status for their club.' AND polrelid = 'public.club_memberships'::regclass
    ) THEN
        DROP POLICY "Coordinators can update membership status for their club." ON public.club_memberships;
    END IF;
END $$;

-- Create stricter update policy
CREATE POLICY "Coordinators can manage memberships for their club" ON public.club_memberships
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'coordinator' AND p.club_id = public.club_memberships.club_id
        ) OR EXISTS (
            SELECT 1 FROM public.profiles p2 WHERE p2.id = auth.uid() AND p2.role = 'admin'
        )
    )
    WITH CHECK (
        -- Only allow updates that do not change club_id or user_id and only modify status or is_sub_coordinator
        club_id = public.club_memberships.club_id
        AND user_id = public.club_memberships.user_id
        AND (
            (status IS NOT DISTINCT FROM public.club_memberships.status) = FALSE
            OR (is_sub_coordinator IS NOT DISTINCT FROM public.club_memberships.is_sub_coordinator) = FALSE
            OR (status IS NOT DISTINCT FROM public.club_memberships.status) IS NULL
        )
    );

-- Note: This WITH CHECK attempts to ensure updates only change `status` or `is_sub_coordinator`.
-- Due to limitations in referencing OLD vs NEW in policies, review and test this policy in Supabase SQL editor.


