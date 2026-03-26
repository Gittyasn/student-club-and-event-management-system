-- Phase 5 patch: enforce attendance lock at the database layer

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

CREATE OR REPLACE FUNCTION public.check_is_coordinator_for_event_safe(p_event_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.events e
    JOIN public.profiles p ON p.club_id = e.club_id
    WHERE e.id = p_event_id
      AND p.id = p_user_id
      AND p.role = 'coordinator'
  );
$$;

CREATE OR REPLACE FUNCTION public.check_is_event_attendance_unlocked_safe(p_event_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.events
    WHERE id = p_event_id
      AND COALESCE(attendance_locked, false) = false
  );
$$;

CREATE OR REPLACE FUNCTION public.prevent_locked_attendance_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_event_id uuid;
    v_locked boolean;
BEGIN
    v_event_id := COALESCE(NEW.event_id, OLD.event_id);

    IF public.check_is_admin_safe(auth.uid()) THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    SELECT COALESCE(attendance_locked, false)
    INTO v_locked
    FROM public.events
    WHERE id = v_event_id;

    IF v_locked THEN
        RAISE EXCEPTION 'Attendance is locked for this event.';
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_locked_attendance_changes ON public.attendance_records;
CREATE TRIGGER trg_prevent_locked_attendance_changes
    BEFORE INSERT OR UPDATE OR DELETE ON public.attendance_records
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_locked_attendance_changes();

DO $$
DECLARE
    policy_row RECORD;
BEGIN
    FOR policy_row IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'attendance_records'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.attendance_records', policy_row.policyname);
    END LOOP;
END $$;

ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own attendance" ON public.attendance_records
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Students can self-insert attendance via QR" ON public.attendance_records
FOR INSERT
WITH CHECK (
    user_id = auth.uid()
    AND public.check_is_event_attendance_unlocked_safe(event_id)
);

CREATE POLICY "Coordinators can view attendance for their events" ON public.attendance_records
FOR SELECT
USING (
    public.check_is_coordinator_for_event_safe(event_id, auth.uid())
);

CREATE POLICY "Coordinators can insert attendance for unlocked events" ON public.attendance_records
FOR INSERT
WITH CHECK (
    public.check_is_coordinator_for_event_safe(event_id, auth.uid())
    AND public.check_is_event_attendance_unlocked_safe(event_id)
);

CREATE POLICY "Coordinators can update attendance for unlocked events" ON public.attendance_records
FOR UPDATE
USING (
    public.check_is_coordinator_for_event_safe(event_id, auth.uid())
    AND public.check_is_event_attendance_unlocked_safe(event_id)
)
WITH CHECK (
    public.check_is_coordinator_for_event_safe(event_id, auth.uid())
    AND public.check_is_event_attendance_unlocked_safe(event_id)
);

CREATE POLICY "Coordinators can delete attendance for unlocked events" ON public.attendance_records
FOR DELETE
USING (
    public.check_is_coordinator_for_event_safe(event_id, auth.uid())
    AND public.check_is_event_attendance_unlocked_safe(event_id)
);

CREATE POLICY "Admins have full access to attendance records" ON public.attendance_records
FOR ALL
USING (
    public.check_is_admin_safe(auth.uid())
)
WITH CHECK (
    public.check_is_admin_safe(auth.uid())
);
