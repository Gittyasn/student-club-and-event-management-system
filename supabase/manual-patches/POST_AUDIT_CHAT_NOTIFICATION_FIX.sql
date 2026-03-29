-- Post-audit fix for:
-- 1. Missing / broken broadcast chat setup
-- 2. Realtime delivery coverage for notifications / chats / messages
-- Safe to rerun.

BEGIN;

ALTER TABLE public.notifications
DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
ADD CONSTRAINT notifications_type_check
CHECK (type IN ('event', 'membership', 'attendance', 'result', 'certificate', 'chat', 'system', 'announcement', 'alert', 'success', 'info'));

CREATE OR REPLACE FUNCTION public.can_manage_club(p_user_id uuid, p_club_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = p_user_id
          AND (
              p.role = 'admin'
              OR (
                  p.role = 'coordinator'
                  AND (
                      p.club_id = p_club_id
                      OR EXISTS (
                          SELECT 1
                          FROM public.clubs c
                          WHERE c.id = p_club_id
                            AND c.coordinator_id = p_user_id
                      )
                      OR EXISTS (
                          SELECT 1
                          FROM public.club_memberships cm
                          WHERE cm.club_id = p_club_id
                            AND cm.user_id = p_user_id
                            AND cm.status = 'approved'
                            AND cm.role = 'sub_coordinator'
                      )
                  )
              )
          )
    );
$$;

CREATE OR REPLACE FUNCTION public.can_manage_event(p_user_id uuid, p_event_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.events e
        WHERE e.id = p_event_id
          AND public.can_manage_club(p_user_id, e.club_id)
    );
$$;

CREATE OR REPLACE FUNCTION public.is_admin_user(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = p_user_id
          AND p.role = 'admin'
    );
$$;

CREATE OR REPLACE FUNCTION public.can_view_profile(p_actor_id uuid, p_target_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        p_actor_id = p_target_id
        OR public.is_admin_user(p_actor_id)
        OR EXISTS (
            SELECT 1
            FROM public.club_memberships cm
            WHERE cm.user_id = p_target_id
              AND cm.status IN ('pending', 'approved', 'suspended')
              AND public.can_manage_club(p_actor_id, cm.club_id)
        )
        OR EXISTS (
            SELECT 1
            FROM public.clubs c
            WHERE c.coordinator_id = p_target_id
              AND public.can_manage_club(p_actor_id, c.id)
        );
$$;

DROP POLICY IF EXISTS "Clubs are viewable by everyone." ON public.clubs;
DROP POLICY IF EXISTS "Coordinators can view their club details." ON public.clubs;
CREATE POLICY "Clubs are viewable by everyone."
ON public.clubs
FOR SELECT
USING (
    (
        COALESCE(visibility, true) = true
        AND COALESCE(status, 'active') = 'active'
    )
    OR public.can_manage_club(auth.uid(), id)
);

DROP POLICY IF EXISTS "Coordinators can update their own club." ON public.clubs;
CREATE POLICY "Coordinators can update their own club."
ON public.clubs
FOR UPDATE
USING (public.can_manage_club(auth.uid(), id))
WITH CHECK (public.can_manage_club(auth.uid(), id));

DROP POLICY IF EXISTS "Coordinators can view memberships for their club" ON public.club_memberships;
DROP POLICY IF EXISTS "Coordinators can update memberships for their club" ON public.club_memberships;
DROP POLICY IF EXISTS "Coordinators can manage memberships for their club" ON public.club_memberships;
DROP POLICY IF EXISTS "Coordinators can manage their club memberships." ON public.club_memberships;

CREATE POLICY "Coordinators can view memberships for their club"
ON public.club_memberships
FOR SELECT
USING (public.can_manage_club(auth.uid(), club_id));

CREATE POLICY "Coordinators can manage memberships for their club"
ON public.club_memberships
FOR UPDATE
USING (public.can_manage_club(auth.uid(), club_id))
WITH CHECK (public.can_manage_club(auth.uid(), club_id));

DROP POLICY IF EXISTS "Students can view and update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view basic profile info" ON public.profiles;
DROP POLICY IF EXISTS "Admins have full profile access" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile." ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles." ON public.profiles;

CREATE POLICY "Authenticated users can view basic profile info"
ON public.profiles
FOR SELECT
USING (public.can_view_profile(auth.uid(), id));

CREATE POLICY "Students can view and update own profile"
ON public.profiles
FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

CREATE POLICY "Admins have full profile access"
ON public.profiles
FOR ALL
USING (public.is_admin_user(auth.uid()))
WITH CHECK (public.is_admin_user(auth.uid()));

CREATE POLICY "Admins can update any profile."
ON public.profiles
FOR UPDATE
USING (auth.uid() = id OR public.is_admin_user(auth.uid()))
WITH CHECK (auth.uid() = id OR public.is_admin_user(auth.uid()));

-- Ensure a broadcast chat room exists for admin/coordinator announcements.
INSERT INTO public.chats (type, title)
SELECT 'broadcast', 'Campus Announcements'
WHERE NOT EXISTS (
    SELECT 1
    FROM public.chats
    WHERE type = 'broadcast'
);

-- Restore the expected RPC used by older/live clients and admin tools.
CREATE OR REPLACE FUNCTION public.create_broadcast_message(
    content text,
    file_url text DEFAULT NULL,
    file_name text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    broadcast_chat_id uuid;
    msg_id uuid;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid()
          AND role IN ('admin', 'coordinator')
    ) THEN
        RAISE EXCEPTION 'Only admins or coordinators can send broadcast messages.';
    END IF;

    SELECT id
    INTO broadcast_chat_id
    FROM public.chats
    WHERE type = 'broadcast'
    ORDER BY created_at
    LIMIT 1;

    IF broadcast_chat_id IS NULL THEN
        INSERT INTO public.chats (type, title)
        VALUES ('broadcast', 'Campus Announcements')
        RETURNING id INTO broadcast_chat_id;
    END IF;

    INSERT INTO public.messages (
        chat_id,
        sender_id,
        content,
        file_url,
        file_name,
        is_announcement
    )
    VALUES (
        broadcast_chat_id,
        auth.uid(),
        content,
        file_url,
        file_name,
        true
    )
    RETURNING id INTO msg_id;

    RETURN msg_id;
END;
$$;

DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications;
CREATE POLICY "Users can delete their own notifications"
ON public.notifications
FOR DELETE
USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.trigger_membership_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    club_name text;
    coord_id uuid;
BEGIN
    SELECT name, coordinator_id
    INTO club_name, coord_id
    FROM public.clubs
    WHERE id = NEW.club_id;

    IF TG_OP = 'INSERT' AND NEW.status = 'pending' THEN
        IF COALESCE((SELECT membership_enabled FROM public.user_notification_preferences WHERE user_id = coord_id), true) THEN
            INSERT INTO public.notifications (user_id, type, title, message, related_id, related_type)
            VALUES (
                coord_id,
                'membership',
                'New Membership Request',
                'A new student has requested to join ' || club_name || '.',
                NEW.club_id,
                'club'
            );
        END IF;
    ELSIF TG_OP = 'UPDATE' AND NEW.status <> OLD.status AND NEW.status IN ('approved', 'rejected') THEN
        IF COALESCE((SELECT membership_enabled FROM public.user_notification_preferences WHERE user_id = NEW.user_id), true) THEN
            INSERT INTO public.notifications (user_id, type, title, message, related_id, related_type)
            VALUES (
                NEW.user_id,
                CASE WHEN NEW.status = 'approved' THEN 'success' ELSE 'alert' END,
                'Club Membership ' || INITCAP(NEW.status),
                'Your request to join ' || club_name || ' has been ' || NEW.status || '.',
                NEW.club_id,
                'club'
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_membership_notification ON public.club_memberships;
CREATE TRIGGER trg_membership_notification
AFTER INSERT OR UPDATE OF status ON public.club_memberships
FOR EACH ROW EXECUTE FUNCTION public.trigger_membership_notification();

CREATE OR REPLACE FUNCTION public.trigger_registration_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    event_title text;
BEGIN
    IF TG_OP = 'UPDATE' AND NEW.status <> OLD.status AND NEW.status = 'registered' THEN
        SELECT title INTO event_title FROM public.events WHERE id = NEW.event_id;

        IF COALESCE((SELECT system_enabled FROM public.user_notification_preferences WHERE user_id = NEW.user_id), true) THEN
            INSERT INTO public.notifications (user_id, type, title, message, related_id, related_type)
            VALUES (
                NEW.user_id,
                'success',
                'Registration Confirmed',
                'You are successfully registered for ' || event_title || '.',
                NEW.event_id,
                'event'
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_registration_notification ON public.registrations;
CREATE TRIGGER trg_registration_notification
AFTER UPDATE OF status ON public.registrations
FOR EACH ROW EXECUTE FUNCTION public.trigger_registration_notification();

CREATE OR REPLACE FUNCTION public.guard_message_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    is_admin boolean;
    is_coordinator_moderator boolean;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    ) INTO is_admin;

    SELECT EXISTS (
        SELECT 1
        FROM public.chats c
        WHERE c.id = OLD.chat_id
          AND (
              (c.type = 'club' AND public.can_manage_club(auth.uid(), c.reference_id)) OR
              (c.type = 'event' AND public.can_manage_event(auth.uid(), c.reference_id))
          )
    ) INTO is_coordinator_moderator;

    IF is_admin OR is_coordinator_moderator THEN
        RETURN NEW;
    END IF;

    IF OLD.sender_id <> auth.uid() THEN
        RAISE EXCEPTION 'You can only update your own messages.';
    END IF;

    IF NEW.is_pinned IS DISTINCT FROM OLD.is_pinned THEN
        RAISE EXCEPTION 'Only coordinators or admins can pin messages.';
    END IF;

    IF NEW.is_announcement IS DISTINCT FROM OLD.is_announcement THEN
        RAISE EXCEPTION 'Only coordinators or admins can publish announcements.';
    END IF;

    IF NEW.chat_id IS DISTINCT FROM OLD.chat_id OR NEW.sender_id IS DISTINCT FROM OLD.sender_id THEN
        RAISE EXCEPTION 'Message ownership and channel cannot be changed.';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_message_update ON public.messages;
CREATE TRIGGER trg_guard_message_update
BEFORE UPDATE ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.guard_message_update();

DROP POLICY IF EXISTS "Events viewable according to rules" ON public.events;
CREATE POLICY "Events viewable according to rules"
ON public.events
FOR SELECT
USING (
    public.can_manage_club(auth.uid(), club_id)
    OR (
        status IN ('approved', 'registration_open', 'registration_closed', 'ongoing', 'completed', 'cancelled')
        AND visibility != 'hidden'
        AND (
            visibility = 'public'
            OR (
                visibility = 'members_only'
                AND EXISTS (
                    SELECT 1
                    FROM public.club_memberships cm
                    WHERE cm.club_id = public.events.club_id
                      AND cm.user_id = auth.uid()
                      AND cm.status IN ('approved', 'core_member', 'sub_coordinator')
                )
            )
            OR (
                visibility = 'private'
                AND EXISTS (
                    SELECT 1
                    FROM public.registrations r
                    WHERE r.event_id = public.events.id
                      AND r.user_id = auth.uid()
                )
            )
        )
    )
);

CREATE OR REPLACE FUNCTION public.sync_event_approval_lifecycle()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

CREATE OR REPLACE FUNCTION public.prevent_pending_event_edits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF public.is_admin_user(auth.uid()) THEN
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

DROP POLICY IF EXISTS "Coordinators can update draft/rejected and submit" ON public.events;
DROP POLICY IF EXISTS "Coordinators can update draft or rejected events." ON public.events;
DROP POLICY IF EXISTS "Coordinators can submit events for approval." ON public.events;
DROP POLICY IF EXISTS "Coordinators can update their own club events." ON public.events;
DROP POLICY IF EXISTS "Coordinators can update draft or returned events" ON public.events;
CREATE POLICY "Coordinators can update draft or returned events"
ON public.events
FOR UPDATE
USING (
    public.can_manage_club(auth.uid(), club_id)
    AND approval_status IN ('draft', 'rejected')
)
WITH CHECK (
    public.can_manage_club(auth.uid(), club_id)
    AND approval_status IN ('draft', 'pending', 'rejected')
    AND status IN ('draft', 'pending')
);

DROP POLICY IF EXISTS "Coordinators can view event registrations" ON public.registrations;
CREATE POLICY "Coordinators can view event registrations"
ON public.registrations
FOR SELECT
USING (public.can_manage_event(auth.uid(), event_id));

DROP POLICY IF EXISTS "Coordinators can mark attendance" ON public.registrations;
CREATE POLICY "Coordinators can mark attendance"
ON public.registrations
FOR UPDATE
USING (public.can_manage_event(auth.uid(), event_id));

DROP POLICY IF EXISTS "Users can check registrations for event." ON public.registrations;
CREATE POLICY "Users can check registrations for event."
ON public.registrations
FOR SELECT
USING (
    public.can_manage_event(auth.uid(), event_id)
    OR EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.role = 'admin'
    )
);

DROP POLICY IF EXISTS "Coordinators can manage registrations." ON public.registrations;
CREATE POLICY "Coordinators can manage registrations."
ON public.registrations
FOR ALL
USING (
    public.can_manage_event(auth.uid(), event_id)
    OR EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.role = 'admin'
    )
);

DROP POLICY IF EXISTS "Coordinators can view attendance for their events" ON public.attendance_records;
CREATE POLICY "Coordinators can view attendance for their events"
ON public.attendance_records
FOR SELECT
USING (public.can_manage_event(auth.uid(), event_id));

DROP POLICY IF EXISTS "Coordinators can insert attendance for their events" ON public.attendance_records;
CREATE POLICY "Coordinators can insert attendance for their events"
ON public.attendance_records
FOR INSERT
WITH CHECK (
    public.can_manage_event(auth.uid(), event_id)
    AND EXISTS (
        SELECT 1
        FROM public.events e
        WHERE e.id = attendance_records.event_id
          AND COALESCE(e.attendance_locked, false) = false
    )
);

DROP POLICY IF EXISTS "Coordinators can update attendance for unlocked events" ON public.attendance_records;
CREATE POLICY "Coordinators can update attendance for unlocked events"
ON public.attendance_records
FOR UPDATE
USING (
    EXISTS (
        SELECT 1
        FROM public.events e
        WHERE e.id = attendance_records.event_id
          AND public.can_manage_event(auth.uid(), attendance_records.event_id)
          AND COALESCE(e.attendance_locked, false) = false
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.events e
        WHERE e.id = attendance_records.event_id
          AND public.can_manage_event(auth.uid(), attendance_records.event_id)
          AND COALESCE(e.attendance_locked, false) = false
    )
);

DROP POLICY IF EXISTS "Coordinators can delete attendance for unlocked events" ON public.attendance_records;
CREATE POLICY "Coordinators can delete attendance for unlocked events"
ON public.attendance_records
FOR DELETE
USING (
    EXISTS (
        SELECT 1
        FROM public.events e
        WHERE e.id = attendance_records.event_id
          AND public.can_manage_event(auth.uid(), attendance_records.event_id)
          AND COALESCE(e.attendance_locked, false) = false
    )
);

CREATE OR REPLACE FUNCTION public.prevent_locked_attendance_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_event_id uuid;
    v_locked boolean;
BEGIN
    v_event_id := COALESCE(NEW.event_id, OLD.event_id);

    IF public.is_admin_user(auth.uid()) THEN
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

DROP POLICY IF EXISTS "Coordinators can manage results for their events" ON public.results;
DROP POLICY IF EXISTS "Coordinators can view results for their events" ON public.results;
CREATE POLICY "Coordinators can view results for their events"
ON public.results
FOR SELECT
USING (public.can_manage_event(auth.uid(), event_id));

DROP POLICY IF EXISTS "Coordinators can insert results for unlocked events" ON public.results;
CREATE POLICY "Coordinators can insert results for unlocked events"
ON public.results
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.events e
        WHERE e.id = results.event_id
          AND public.can_manage_event(auth.uid(), results.event_id)
          AND COALESCE(e.results_locked, false) = false
    )
);

DROP POLICY IF EXISTS "Coordinators can update results for unlocked events" ON public.results;
CREATE POLICY "Coordinators can update results for unlocked events"
ON public.results
FOR UPDATE
USING (
    EXISTS (
        SELECT 1
        FROM public.events e
        WHERE e.id = results.event_id
          AND public.can_manage_event(auth.uid(), results.event_id)
          AND COALESCE(e.results_locked, false) = false
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.events e
        WHERE e.id = results.event_id
          AND public.can_manage_event(auth.uid(), results.event_id)
          AND COALESCE(e.results_locked, false) = false
    )
);

DROP POLICY IF EXISTS "Coordinators can delete results for unlocked events" ON public.results;
CREATE POLICY "Coordinators can delete results for unlocked events"
ON public.results
FOR DELETE
USING (
    EXISTS (
        SELECT 1
        FROM public.events e
        WHERE e.id = results.event_id
          AND public.can_manage_event(auth.uid(), results.event_id)
          AND COALESCE(e.results_locked, false) = false
    )
);

CREATE OR REPLACE FUNCTION public.prevent_locked_result_edit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_event_id uuid;
    v_locked boolean;
BEGIN
    v_event_id := COALESCE(NEW.event_id, OLD.event_id);

    IF public.is_admin_user(auth.uid()) THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    SELECT COALESCE(results_locked, false)
    INTO v_locked
    FROM public.events
    WHERE id = v_event_id;

    IF v_locked OR OLD.status = 'locked' THEN
        RAISE EXCEPTION 'Results are locked and cannot be modified.';
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_locked_result_edit ON public.results;
CREATE TRIGGER trg_prevent_locked_result_edit
BEFORE UPDATE OR DELETE ON public.results
FOR EACH ROW
EXECUTE FUNCTION public.prevent_locked_result_edit();

DROP POLICY IF EXISTS "Coordinators can manage certificates for their events" ON public.certificates;
CREATE POLICY "Coordinators can manage certificates for their events"
ON public.certificates
FOR ALL
USING (public.can_manage_event(auth.uid(), event_id));

DROP POLICY IF EXISTS "Coordinators can view club and event chats" ON public.chats;
CREATE POLICY "Coordinators can view club and event chats"
ON public.chats
FOR SELECT
USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'coordinator')
    AND (
        (type = 'club' AND public.can_manage_club(auth.uid(), reference_id))
        OR (type = 'event' AND public.can_manage_event(auth.uid(), reference_id))
        OR type = 'broadcast'
        OR (type = 'direct' AND id IN (SELECT chat_id FROM public.chat_members WHERE user_id = auth.uid()))
    )
);

DROP POLICY IF EXISTS "Users can view messages in authorized chats" ON public.messages;
CREATE POLICY "Users can view messages in authorized chats"
ON public.messages
FOR SELECT
USING (
    chat_id IN (
        SELECT id
        FROM public.chats
        WHERE type = 'broadcast'
           OR (type = 'direct' AND id IN (SELECT chat_id FROM public.chat_members WHERE user_id = auth.uid()))
           OR (type = 'club' AND reference_id IN (SELECT club_id FROM public.club_memberships WHERE user_id = auth.uid() AND status = 'approved'))
           OR (type = 'club' AND public.can_manage_club(auth.uid(), reference_id))
           OR (type = 'event' AND reference_id IN (SELECT event_id FROM public.registrations WHERE user_id = auth.uid() AND status = 'registered'))
           OR (type = 'event' AND public.can_manage_event(auth.uid(), reference_id))
    )
);

DROP POLICY IF EXISTS "Users can insert messages in valid chats" ON public.messages;
CREATE POLICY "Users can insert messages in valid chats"
ON public.messages
FOR INSERT
WITH CHECK (
    sender_id = auth.uid()
    AND chat_id IN (
        SELECT id
        FROM public.chats
        WHERE (type = 'direct' AND id IN (SELECT chat_id FROM public.chat_members WHERE user_id = auth.uid()))
           OR (type = 'club' AND reference_id IN (SELECT club_id FROM public.club_memberships WHERE user_id = auth.uid() AND status = 'approved'))
           OR (type = 'club' AND public.can_manage_club(auth.uid(), reference_id))
           OR (type = 'event' AND reference_id IN (SELECT event_id FROM public.registrations WHERE user_id = auth.uid() AND status = 'registered'))
           OR (type = 'event' AND public.can_manage_event(auth.uid(), reference_id))
           OR (type = 'broadcast' AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'coordinator')))
    )
);

DROP POLICY IF EXISTS "Coordinators can moderate club/event messages" ON public.messages;
CREATE POLICY "Coordinators can moderate club/event messages"
ON public.messages
FOR UPDATE
USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'coordinator')
    AND chat_id IN (
        SELECT id
        FROM public.chats
        WHERE (type = 'club' AND public.can_manage_club(auth.uid(), reference_id))
           OR (type = 'event' AND public.can_manage_event(auth.uid(), reference_id))
    )
);

CREATE OR REPLACE FUNCTION public.process_event_reminders()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    upcoming_event RECORD;
BEGIN
    FOR upcoming_event IN
        SELECT id, title, start_time
        FROM public.events
        WHERE status = 'approved'
          AND start_time >= NOW() + INTERVAL '23 hours'
          AND start_time <= NOW() + INTERVAL '24 hours'
    LOOP
        INSERT INTO public.notifications (user_id, type, title, message, related_id, related_type)
        SELECT
            r.user_id,
            'event',
            'Upcoming Event Reminder',
            'Reminder: "' || upcoming_event.title || '" is starting within 24 hours!',
            upcoming_event.id,
            'event'
        FROM public.registrations r
        JOIN public.user_notification_preferences p ON r.user_id = p.user_id
        WHERE r.event_id = upcoming_event.id
          AND r.status = 'registered'
          AND p.event_reminders_enabled = true;
    END LOOP;
END;
$$;

-- Realtime needs full row identity for update/delete sync and stable payloads.
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.chats REPLICA IDENTITY FULL;
ALTER TABLE public.messages REPLICA IDENTITY FULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_publication
        WHERE pubname = 'supabase_realtime'
    ) THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = 'notifications'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = 'chats'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.chats;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = 'messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
    END IF;
END $$;

COMMIT;
