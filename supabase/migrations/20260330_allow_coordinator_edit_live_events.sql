-- Allow coordinators to edit their own live/approved events as long as the event
-- has not reached a final locked state.

DROP POLICY IF EXISTS "Coordinators can update draft/rejected and submit" ON public.events;
DROP POLICY IF EXISTS "Coordinators can update draft or rejected events." ON public.events;
DROP POLICY IF EXISTS "Coordinators can submit events for approval." ON public.events;
DROP POLICY IF EXISTS "Coordinators can update their own club events." ON public.events;
DROP POLICY IF EXISTS "Coordinators can update draft or returned events" ON public.events;
DROP POLICY IF EXISTS "Coordinators can update editable events" ON public.events;

CREATE POLICY "Coordinators can update editable events"
ON public.events
FOR UPDATE
USING (
    (
        EXISTS (
            SELECT 1
            FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.role = 'admin'
        )
        OR EXISTS (
            SELECT 1
            FROM public.profiles p
            LEFT JOIN public.clubs c ON c.id = public.events.club_id
            WHERE p.id = auth.uid()
              AND p.role = 'coordinator'
              AND (
                  p.club_id = public.events.club_id
                  OR c.coordinator_id = auth.uid()
                  OR EXISTS (
                      SELECT 1
                      FROM public.club_memberships cm
                      WHERE cm.club_id = public.events.club_id
                        AND cm.user_id = auth.uid()
                        AND cm.role = 'sub_coordinator'
                        AND cm.status = 'approved'
                  )
              )
        )
    )
    AND public.events.status NOT IN ('completed', 'archived', 'cancelled')
)
WITH CHECK (
    (
        EXISTS (
            SELECT 1
            FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.role = 'admin'
        )
        OR EXISTS (
            SELECT 1
            FROM public.profiles p
            LEFT JOIN public.clubs c ON c.id = public.events.club_id
            WHERE p.id = auth.uid()
              AND p.role = 'coordinator'
              AND (
                  p.club_id = public.events.club_id
                  OR c.coordinator_id = auth.uid()
                  OR EXISTS (
                      SELECT 1
                      FROM public.club_memberships cm
                      WHERE cm.club_id = public.events.club_id
                        AND cm.user_id = auth.uid()
                        AND cm.role = 'sub_coordinator'
                        AND cm.status = 'approved'
                  )
              )
        )
    )
    AND public.events.status NOT IN ('completed', 'archived', 'cancelled')
);
