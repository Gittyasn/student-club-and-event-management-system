-- Migration: Final Fix for RLS Infinite Recursion on Events Table (V2 - Robust)
-- File: 20260402_fix_final_rls_recursion.sql
-- Goal: Break recursion by avoiding LANGUAGE sql in security helper functions
--       and ensuring all required helper functions exist.

-- 0. COMPREHENSIVE POLICY CLEANUP
DO $$ 
BEGIN
    -- Events Policies
    DROP POLICY IF EXISTS "Events viewable according to rules" ON public.events;
    DROP POLICY IF EXISTS "Events select policy" ON public.events;
    DROP POLICY IF EXISTS "Students can browse approved events only" ON public.events;
    DROP POLICY IF EXISTS "Events are viewable by everyone." ON public.events;
    DROP POLICY IF EXISTS "Admins have full access to events" ON public.events;
    DROP POLICY IF EXISTS "Events update policy" ON public.events;
    DROP POLICY IF EXISTS "Events insert policy" ON public.events;
    DROP POLICY IF EXISTS "Events delete policy" ON public.events;
    DROP POLICY IF EXISTS "Coordinators can update editable events" ON public.events;
    DROP POLICY IF EXISTS "Coordinators can update draft/rejected and submit." ON public.events;
    DROP POLICY IF EXISTS "Coordinators can update draft or rejected events." ON public.events;
    DROP POLICY IF EXISTS "Coordinators can submit events for approval." ON public.events;
    DROP POLICY IF EXISTS "Coordinators can update their own club events." ON public.events;
    DROP POLICY IF EXISTS "Coordinators can update draft or returned events" ON public.events;
    DROP POLICY IF EXISTS "Coordinators can insert events for their club." ON public.events;
    DROP POLICY IF EXISTS "Coordinators can update draft/rejected and submit" ON public.events;
    DROP POLICY IF EXISTS "Coordinators can delete draft events." ON public.events;
    DROP POLICY IF EXISTS "Admins can insert events." ON public.events;
    DROP POLICY IF EXISTS "Admins can update events." ON public.events;
    DROP POLICY IF EXISTS "Admins can delete events." ON public.events;

    -- Registrations Policies
    DROP POLICY IF EXISTS "Users can check registrations for event." ON public.registrations;
    DROP POLICY IF EXISTS "Registrations select policy" ON public.registrations;
    DROP POLICY IF EXISTS "Registrations manage policy" ON public.registrations;
    DROP POLICY IF EXISTS "Coordinators can manage registrations." ON public.registrations;
    DROP POLICY IF EXISTS "Students can register themselves" ON public.registrations;
    DROP POLICY IF EXISTS "Students can only register themselves" ON public.registrations;
EXCEPTION WHEN OTHERS THEN 
    NULL;
END $$;

-- 1. Helper: check_is_admin
CREATE OR REPLACE FUNCTION public.check_is_admin(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id AND role = 'admin');
END;
$$;

-- 2. Helper: check_is_club_member
CREATE OR REPLACE FUNCTION public.check_is_club_member(p_club_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.club_memberships 
        WHERE club_id = p_club_id 
          AND user_id = p_user_id 
          AND status IN ('approved', 'core_member', 'sub_coordinator')
    );
END;
$$;

-- 3. Helper: check_is_registered
CREATE OR REPLACE FUNCTION public.check_is_registered(p_event_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.registrations 
        WHERE event_id = p_event_id AND user_id = p_user_id
    );
END;
$$;

-- 4. Helper: check_is_coordinator_for_club
CREATE OR REPLACE FUNCTION public.check_is_coordinator_for_club(p_club_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF p_user_id IS NULL THEN RETURN false; END IF;
    IF EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id AND role = 'admin') THEN RETURN true; END IF;

    RETURN EXISTS (
        SELECT 1
        FROM public.profiles p
        LEFT JOIN public.clubs c ON c.id = p_club_id
        WHERE p.id = p_user_id
          AND p.role = 'coordinator'
          AND (
            p.club_id = p_club_id
            OR c.coordinator_id = p_user_id
            OR EXISTS (
                SELECT 1
                FROM public.club_memberships cm
                WHERE cm.club_id = p_club_id
                  AND cm.user_id = p_user_id
                  AND cm.status = 'approved'
                  AND cm.role = 'sub_coordinator'
            )
          )
    );
END;
$$;

-- 5. Helper: check_is_coordinator_for_event
CREATE OR REPLACE FUNCTION public.check_is_coordinator_for_event(p_event_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_club_id uuid;
BEGIN
    SELECT club_id INTO v_club_id FROM public.events WHERE id = p_event_id;
    IF v_club_id IS NULL THEN RETURN false; END IF;
    RETURN public.check_is_coordinator_for_club(v_club_id, p_user_id);
END;
$$;

-- 6. Re-create EVENTS Policies
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Events select policy" ON public.events FOR SELECT USING (
    public.check_is_admin(auth.uid())
    OR public.check_is_coordinator_for_club(club_id, auth.uid())
    OR (
        status IN ('approved', 'registration_open', 'registration_closed', 'ongoing', 'completed', 'cancelled')
        AND (
            visibility = 'public' 
            OR (visibility = 'members_only' AND public.check_is_club_member(club_id, auth.uid()))
            OR (visibility = 'private' AND public.check_is_registered(id, auth.uid()))
        )
    )
);

CREATE POLICY "Events insert policy" ON public.events FOR INSERT WITH CHECK (
    public.check_is_admin(auth.uid())
    OR (
        public.check_is_coordinator_for_club(club_id, auth.uid())
        AND EXISTS (SELECT 1 FROM public.clubs WHERE id = club_id AND status = 'active' AND allow_event_creation = true)
    )
);

CREATE POLICY "Events update policy" ON public.events FOR UPDATE USING (
    public.check_is_admin(auth.uid())
    OR (
        public.check_is_coordinator_for_club(club_id, auth.uid())
        AND status NOT IN ('completed', 'archived', 'cancelled')
    )
);

CREATE POLICY "Events delete policy" ON public.events FOR DELETE USING (
    public.check_is_admin(auth.uid())
    OR (public.check_is_coordinator_for_club(club_id, auth.uid()) AND status = 'draft')
);

CREATE POLICY "Admins have full access to events" ON public.events FOR ALL USING (public.check_is_admin(auth.uid()));

-- 7. Re-create REGISTRATIONS Policies
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Registrations select policy" ON public.registrations FOR SELECT USING (
    public.check_is_admin(auth.uid())
    OR public.check_is_coordinator_for_event(event_id, auth.uid())
    OR user_id = auth.uid()
);

CREATE POLICY "Registrations manage policy" ON public.registrations FOR ALL USING (
    public.check_is_admin(auth.uid())
    OR public.check_is_coordinator_for_event(event_id, auth.uid())
);

-- 8. Visibility Functions for standard check
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean AS $$
BEGIN RETURN public.check_is_admin(auth.uid()); END; $$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 9. Explicit GRANTs
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;
