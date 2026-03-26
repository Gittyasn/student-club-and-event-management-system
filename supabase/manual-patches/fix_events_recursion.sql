CREATE OR REPLACE FUNCTION get_user_club_id(uid uuid)
RETURNS uuid
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT club_id FROM profiles WHERE id = uid LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION get_event_club_id(eid uuid)
RETURNS uuid
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT club_id FROM events WHERE id = eid LIMIT 1;
$$;

-- Drop the recursive SELECT policy on 'events' which references 'registrations' for 'private' events.
DROP POLICY IF EXISTS "Events viewable according to rules" ON public.events;

-- Re-create it without joining the registration table for private events, or use a security definer function instead.
CREATE OR REPLACE FUNCTION is_user_registered(uid uuid, eid uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM registrations WHERE user_id = uid AND event_id = eid);
$$;

CREATE POLICY "Events viewable according to rules" ON public.events FOR SELECT USING (
  -- Admins can view all
  (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')) OR 
  -- Coordinators can view their own club's events (using security definer to avoid profile -> events circle)
  (get_user_club_id(auth.uid()) = events.club_id) OR
  -- Public events filtering
  (
    status IN ('approved', 'registration_open', 'registration_closed', 'ongoing', 'completed', 'cancelled') AND
    visibility <> 'hidden' AND
    (
      visibility = 'public' OR 
      (visibility = 'members_only' AND EXISTS (
          SELECT 1 FROM club_memberships 
          WHERE club_memberships.club_id = events.club_id AND club_memberships.user_id = auth.uid() AND club_memberships.status IN ('approved', 'core_member', 'sub_coordinator')
      )) OR 
      (visibility = 'private' AND is_user_registered(auth.uid(), events.id))
    )
  )
);

-- Drop recursive registrations policies
DROP POLICY IF EXISTS "Users can check registrations for event." ON public.registrations;
DROP POLICY IF EXISTS "Coordinators can manage registrations." ON public.registrations;

-- Re-create them using the security definer function to avoid joining `events` which checks `registrations`
CREATE POLICY "Users can check registrations for event." ON public.registrations FOR SELECT USING (
  -- Coordinators
  (get_user_club_id(auth.uid()) = get_event_club_id(registrations.event_id)) OR
  -- Admins
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') OR
  -- Themselves
  (auth.uid() = user_id)
);

CREATE POLICY "Coordinators can manage registrations." ON public.registrations FOR ALL USING (
  (get_user_club_id(auth.uid()) = get_event_club_id(registrations.event_id)) OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
