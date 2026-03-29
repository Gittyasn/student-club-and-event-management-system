-- Phase 3 patch: secure event approval lifecycle and public/student visibility

ALTER TABLE public.events
    DROP CONSTRAINT IF EXISTS events_approval_status_check;

ALTER TABLE public.events
    ADD CONSTRAINT events_approval_status_check
    CHECK (approval_status IN ('draft', 'pending', 'approved', 'rejected'));

ALTER TABLE public.events
    ALTER COLUMN approval_status SET DEFAULT 'draft';

UPDATE public.events
SET approval_status = CASE
    WHEN status = 'draft' THEN 'draft'
    WHEN status = 'pending' THEN 'pending'
    WHEN status = 'rejected' THEN 'rejected'
    WHEN status IN ('approved', 'registration_open', 'registration_closed', 'ongoing', 'completed', 'cancelled', 'archived') THEN 'approved'
    ELSE COALESCE(approval_status, 'draft')
END
WHERE approval_status IS DISTINCT FROM CASE
    WHEN status = 'draft' THEN 'draft'
    WHEN status = 'pending' THEN 'pending'
    WHEN status = 'rejected' THEN 'rejected'
    WHEN status IN ('approved', 'registration_open', 'registration_closed', 'ongoing', 'completed', 'cancelled', 'archived') THEN 'approved'
    ELSE COALESCE(approval_status, 'draft')
END;

CREATE OR REPLACE FUNCTION public.sync_event_approval_lifecycle()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.approval_status = 'rejected' THEN
        NEW.status := 'draft';
        NEW.submitted_at := NULL;
        NEW.approved_at := NULL;
    ELSIF NEW.approval_status = 'pending' OR NEW.status = 'pending' THEN
        NEW.status := 'pending';
        NEW.approval_status := 'pending';
        NEW.submitted_at := COALESCE(NEW.submitted_at, NOW());
        NEW.approved_at := NULL;
        NEW.rejection_reason := NULL;
    ELSIF NEW.approval_status = 'draft' THEN
        NEW.status := 'draft';
        NEW.approval_status := 'draft';
        NEW.submitted_at := NULL;
        NEW.approved_at := NULL;
        NEW.rejection_reason := NULL;
    ELSIF NEW.status IN ('approved', 'registration_open', 'registration_closed', 'ongoing', 'completed', 'cancelled', 'archived')
        OR NEW.approval_status = 'approved' THEN
        NEW.approval_status := 'approved';
        NEW.approved_at := COALESCE(NEW.approved_at, NOW());
        NEW.rejection_reason := NULL;
    ELSIF NEW.status = 'draft' AND COALESCE(NEW.approval_status, 'draft') = 'draft' THEN
        NEW.approval_status := 'draft';
        NEW.submitted_at := NULL;
        NEW.approved_at := NULL;
        NEW.rejection_reason := NULL;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_event_approval_lifecycle ON public.events;
CREATE TRIGGER trg_sync_event_approval_lifecycle
    BEFORE INSERT OR UPDATE ON public.events
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_event_approval_lifecycle();

CREATE OR REPLACE FUNCTION public.check_is_admin_safe(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = p_user_id
      AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.check_is_coordinator_for_club_safe(p_club_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = p_user_id
      AND role = 'coordinator'
      AND club_id = p_club_id
  );
$$;

CREATE OR REPLACE FUNCTION public.check_is_club_member_safe(p_club_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.club_memberships
    WHERE club_id = p_club_id
      AND user_id = p_user_id
      AND status IN ('approved', 'core_member', 'sub_coordinator')
  );
$$;

CREATE OR REPLACE FUNCTION public.check_is_registered_safe(p_event_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.registrations
    WHERE event_id = p_event_id
      AND user_id = p_user_id
  );
$$;

DO $$
DECLARE
    policy_row RECORD;
BEGIN
    FOR policy_row IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'events'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.events', policy_row.policyname);
    END LOOP;
END $$;

CREATE POLICY "Events visible by approval stage" ON public.events
FOR SELECT
USING (
    check_is_admin_safe(auth.uid())
    OR check_is_coordinator_for_club_safe(public.events.club_id, auth.uid())
    OR (
        approval_status = 'approved'
        AND status IN ('approved', 'registration_open', 'registration_closed', 'ongoing', 'completed', 'cancelled')
        AND visibility <> 'hidden'
        AND (
            visibility = 'public'
            OR (
                auth.uid() IS NOT NULL
                AND visibility = 'members_only'
                AND check_is_club_member_safe(public.events.club_id, auth.uid())
            )
            OR (
                auth.uid() IS NOT NULL
                AND visibility = 'private'
                AND check_is_registered_safe(public.events.id, auth.uid())
            )
        )
    )
);

CREATE POLICY "Coordinators can insert events for their club" ON public.events
FOR INSERT
WITH CHECK (
    check_is_coordinator_for_club_safe(public.events.club_id, auth.uid())
);

CREATE POLICY "Coordinators can update draft/rejected and submit" ON public.events
FOR UPDATE
USING (
  check_is_coordinator_for_club_safe(public.events.club_id, auth.uid())
  AND approval_status IN ('draft', 'rejected')
)
WITH CHECK (
  check_is_coordinator_for_club_safe(public.events.club_id, auth.uid())
  AND approval_status IN ('draft', 'pending', 'rejected')
  AND status IN ('draft', 'pending')
);

CREATE OR REPLACE FUNCTION public.prevent_pending_event_edits()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF check_is_admin_safe(auth.uid()) THEN
        RETURN NEW;
    END IF;

    IF OLD.approval_status = 'pending' THEN
        RAISE EXCEPTION 'Pending events are locked while awaiting admin review.';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_pending_event_edits ON public.events;
CREATE TRIGGER trg_prevent_pending_event_edits
BEFORE UPDATE ON public.events
FOR EACH ROW
EXECUTE FUNCTION public.prevent_pending_event_edits();

CREATE POLICY "Coordinators can delete draft events" ON public.events
FOR DELETE
USING (
    check_is_coordinator_for_club_safe(public.events.club_id, auth.uid())
    AND status = 'draft'
);

CREATE POLICY "Admins have full access to events" ON public.events
FOR ALL
USING (
    check_is_admin_safe(auth.uid())
)
WITH CHECK (
    check_is_admin_safe(auth.uid())
);
