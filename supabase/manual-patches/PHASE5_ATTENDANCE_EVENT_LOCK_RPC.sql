-- Phase 5 patch: reliable attendance lock/unlock RPCs for coordinator/admin

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

CREATE OR REPLACE FUNCTION public.lock_event_attendance(p_event_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT (
        public.check_is_admin_safe(auth.uid())
        OR public.check_is_coordinator_for_event_safe(p_event_id, auth.uid())
    ) THEN
        RAISE EXCEPTION 'Unauthorized to lock attendance for this event.';
    END IF;

    UPDATE public.events
    SET attendance_locked = true,
        attendance_locked_at = NOW()
    WHERE id = p_event_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.unlock_event_attendance(p_event_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.check_is_admin_safe(auth.uid()) THEN
        RAISE EXCEPTION 'Only admins can unlock attendance.';
    END IF;

    UPDATE public.events
    SET attendance_locked = false,
        attendance_locked_at = NULL
    WHERE id = p_event_id;
END;
$$;
