-- Database Migration for Event Approval Workflow Module (20260226)

-- 1. Modify events table for comprehensive auditing
ALTER TABLE public.events 
    ADD COLUMN IF NOT EXISTS submitted_at timestamp with time zone,
    ADD COLUMN IF NOT EXISTS approved_at timestamp with time zone,
    ADD COLUMN IF NOT EXISTS rejected_at timestamp with time zone,
    ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS rejected_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS resubmission_count integer DEFAULT 0;

-- Ensure submitted_at is populated for existing pending/approved events if null
UPDATE public.events 
SET submitted_at = start_time - interval '7 days' 
WHERE status IN ('pending', 'approved', 'registration_open', 'registration_closed', 'ongoing', 'completed', 'cancelled', 'archived') 
AND submitted_at IS NULL;

-- 2. Modify Row-Level Security (RLS) for Coordinators

-- Drop the old overly permissive updating policy
DROP POLICY IF EXISTS "Coordinators can update their own club events." ON public.events;

-- Redefine modify policy: Coordinators can ONLY update events that are 'draft' or 'rejected'.
CREATE POLICY "Coordinators can update draft or rejected events." ON public.events FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'coordinator' AND club_id = public.events.club_id
  ) AND status IN ('draft', 'rejected')
);

-- Note: To allow Coordinators to actually click "Submit for Approval" (which changes status to 'pending'),
-- we need a specific policy that allows state transition from draft/rejected ONLY to pending.
-- Alternatively, we can allow updates to the status field specifically.

-- Let's make an explicit policy for state transitions:
CREATE POLICY "Coordinators can submit events for approval." ON public.events FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'coordinator' AND club_id = public.events.club_id
  ) AND status IN ('draft', 'rejected')
) WITH CHECK (
  status = 'pending' -- Can only push it to pending.
);

-- Note: PostgreSQL RLS WITH CHECK clause restricts the NEW row. USING restricts the OLD row.
-- The above two policies might conflict or overlap. A better approach is one consolidated policy:

DROP POLICY IF EXISTS "Coordinators can update draft or rejected events." ON public.events;
DROP POLICY IF EXISTS "Coordinators can submit events for approval." ON public.events;

CREATE POLICY "Coordinators can update draft/rejected and submit." ON public.events FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'coordinator' AND club_id = public.events.club_id
  ) AND approval_status IN ('draft', 'rejected')
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'coordinator' AND club_id = public.events.club_id
  ) AND approval_status IN ('draft', 'pending', 'rejected')
    AND status IN ('draft', 'pending')
);

-- 3. Enhance audit_logs (already exists from admin governance, but ensuring we use it correctly)
-- No structural changes needed for audit_logs, but we will extensively write to it from the React client.
