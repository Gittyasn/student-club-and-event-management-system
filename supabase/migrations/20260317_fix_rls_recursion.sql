-- Fix Infinite Recursion in RLS Policies

-- 1. Function to check if user is coordinator for a specific event's club
CREATE OR REPLACE FUNCTION public.check_is_coordinator_for_event(p_event_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.events e
    JOIN public.profiles p ON p.club_id = e.club_id
    WHERE e.id = p_event_id AND p.id = p_user_id AND p.role = 'coordinator'
  );
$$;

-- 2. Function to check if user is admin
CREATE OR REPLACE FUNCTION public.check_is_admin(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = p_user_id AND role = 'admin'
  );
$$;

-- 3. Function to check if user is member of a club
CREATE OR REPLACE FUNCTION public.check_is_club_member(p_club_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.club_memberships 
    WHERE club_id = p_club_id AND user_id = p_user_id AND status IN ('approved', 'core_member', 'sub_coordinator')
  );
$$;

-- 4. Function to check registration
CREATE OR REPLACE FUNCTION public.check_is_registered(p_event_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.registrations WHERE event_id = p_event_id AND user_id = p_user_id
  );
$$;

-- Update EVENTS Policies
DROP POLICY IF EXISTS "Events viewable according to rules" ON public.events;
CREATE POLICY "Events viewable according to rules" ON public.events FOR SELECT USING (
    check_is_admin(auth.uid())
    OR 
    (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'coordinator' AND p.club_id = public.events.club_id))
    OR
    (
        status IN ('approved', 'registration_open', 'registration_closed', 'ongoing', 'completed', 'cancelled')
        AND visibility != 'hidden'
        AND (
            visibility = 'public' 
            OR 
            (visibility = 'members_only' AND check_is_club_member(club_id, auth.uid()))
            OR
            (visibility = 'private' AND check_is_registered(id, auth.uid()))
        )
    )
);

-- Update REGISTRATIONS Policies
DROP POLICY IF EXISTS "Users can check registrations for event." ON public.registrations;
CREATE POLICY "Users can check registrations for event." ON public.registrations FOR SELECT USING (
    check_is_coordinator_for_event(event_id, auth.uid())
    OR 
    check_is_admin(auth.uid())
);

DROP POLICY IF EXISTS "Coordinators can manage registrations." ON public.registrations;
CREATE POLICY "Coordinators can manage registrations." ON public.registrations FOR ALL USING (
    check_is_coordinator_for_event(event_id, auth.uid())
    OR 
    check_is_admin(auth.uid())
);
