-- Add approval_status to events table
ALTER TABLE public.events
ADD COLUMN approval_status text CHECK (approval_status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending';

-- Drop existing policies to redefine them
DROP POLICY IF EXISTS "Events are viewable by everyone." ON public.events;
DROP POLICY IF EXISTS "Coordinators can insert events for their club." ON public.events;
DROP POLICY IF EXISTS "Coordinators can update their own club events." ON public.events;

-- 1. SELECT Policy
CREATE POLICY "Access control for events"
ON public.events FOR SELECT
USING (
  -- Public/Students can see Approved and Non-Draft events
  (approval_status = 'approved' AND status != 'draft')
  OR
  -- Authenticated users (Coordinators/Admins) with specific rights
  (auth.uid() IS NOT NULL AND (
    -- Admin can see everything
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    OR
    -- Coordinators can see events for their club
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'coordinator' AND club_id = public.events.club_id)
  ))
);

-- 2. INSERT Policy
CREATE POLICY "Coordinators and Admins can insert events"
ON public.events FOR INSERT
WITH CHECK (
  (auth.uid() IS NOT NULL AND (
    -- Admin
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    OR
    -- Coordinator for their club
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'coordinator' AND club_id = public.events.club_id)
  ))
);

-- 3. UPDATE Policy
CREATE POLICY "Coordinators and Admins can update events"
ON public.events FOR UPDATE
USING (
  (auth.uid() IS NOT NULL AND (
    -- Admin
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    OR
    -- Coordinator for their club
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'coordinator' AND club_id = public.events.club_id)
  ))
);
