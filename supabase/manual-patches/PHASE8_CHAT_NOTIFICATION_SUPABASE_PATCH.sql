-- Phase 8: Chat + Notification schema/policy alignment
-- Safe to rerun.

BEGIN;

-- Create notification preferences table if this database does not have it yet.
CREATE TABLE IF NOT EXISTS public.user_notification_preferences (
    user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    email_enabled boolean DEFAULT true,
    event_reminders_enabled boolean DEFAULT true,
    chat_enabled boolean DEFAULT true,
    membership_enabled boolean DEFAULT true,
    system_enabled boolean DEFAULT true,
    updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Notifications schema alignment
ALTER TABLE public.notifications
    ADD COLUMN IF NOT EXISTS title text,
    ADD COLUMN IF NOT EXISTS related_id uuid,
    ADD COLUMN IF NOT EXISTS related_type text,
    ADD COLUMN IF NOT EXISTS delivered boolean DEFAULT false;

ALTER TABLE public.notifications
    ALTER COLUMN title SET DEFAULT 'Notification';

UPDATE public.notifications
SET title = COALESCE(NULLIF(title, ''), INITCAP(COALESCE(type, 'info')) || ' Update')
WHERE title IS NULL OR btrim(title) = '';

ALTER TABLE public.notifications
    ALTER COLUMN title SET NOT NULL;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notification_preferences ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
    notif_policy record;
    pref_policy record;
BEGIN
    FOR notif_policy IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'notifications'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.notifications', notif_policy.policyname);
    END LOOP;

    FOR pref_policy IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'user_notification_preferences'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.user_notification_preferences', pref_policy.policyname);
    END LOOP;
END $$;

CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications (read status)"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications"
ON public.notifications
FOR DELETE
USING (
    auth.uid() = user_id
    OR EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid()
          AND role IN ('admin', 'coordinator')
    )
);

CREATE POLICY "Privileged users can insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1
            FROM public.profiles
            WHERE id = auth.uid()
              AND role IN ('admin', 'coordinator')
        )
        OR EXISTS (
            SELECT 1
            FROM public.profiles actor
            JOIN public.events e
              ON e.id = notifications.related_id
            JOIN public.profiles coord
              ON coord.club_id = e.club_id
             AND coord.role = 'coordinator'
            WHERE actor.id = auth.uid()
              AND actor.role = 'student'
              AND notifications.related_type = 'event'
              AND coord.id = notifications.user_id
        )
        OR EXISTS (
            SELECT 1
            FROM public.profiles actor
            JOIN public.clubs c
              ON c.id = notifications.related_id
            JOIN public.profiles coord
              ON coord.club_id = c.id
             AND coord.role = 'coordinator'
            WHERE actor.id = auth.uid()
              AND actor.role = 'student'
              AND notifications.related_type = 'club'
              AND coord.id = notifications.user_id
        )
    )
);

CREATE POLICY "Users can view their own preferences"
ON public.user_notification_preferences
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
ON public.user_notification_preferences
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences"
ON public.user_notification_preferences
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Keep preferences in sync if the table exists
INSERT INTO public.user_notification_preferences (user_id)
SELECT id
FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;

-- Broadcast RPC aligned to current notifications schema
CREATE OR REPLACE FUNCTION public.create_broadcast_notification(
    p_title TEXT,
    p_message TEXT,
    p_target_role TEXT DEFAULT 'all',
    p_target_club_id UUID DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid()
          AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Only admins can broadcast notifications.';
    END IF;

    IF p_target_club_id IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, type, title, message, related_id, related_type)
        SELECT cm.user_id, 'announcement', p_title, p_message, p_target_club_id, 'club'
        FROM public.club_memberships cm
        WHERE cm.club_id = p_target_club_id
          AND cm.status IN ('approved', 'core_member', 'sub_coordinator');
    ELSE
        INSERT INTO public.notifications (user_id, type, title, message)
        SELECT p.id, 'announcement', p_title, p_message
        FROM public.profiles p
        WHERE p_target_role = 'all' OR p.role = p_target_role;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.dispatch_notification(
    p_user_id uuid,
    p_type text,
    p_title text,
    p_message text,
    p_related_id uuid DEFAULT NULL,
    p_related_type text DEFAULT NULL
) RETURNS uuid AS $$
DECLARE
    v_actor_id uuid := auth.uid();
    v_actor_role text;
    v_notification_id uuid;
    v_allowed boolean := false;
BEGIN
    SELECT role
    INTO v_actor_role
    FROM public.profiles
    WHERE id = v_actor_id;

    IF v_actor_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    IF v_actor_id = p_user_id THEN
        v_allowed := true;
    ELSIF v_actor_role IN ('admin', 'coordinator') THEN
        v_allowed := true;
    ELSIF v_actor_role = 'student' AND p_related_type = 'event' THEN
        SELECT EXISTS (
            SELECT 1
            FROM public.events e
            JOIN public.profiles coord
              ON coord.club_id = e.club_id
             AND coord.role = 'coordinator'
            WHERE e.id = p_related_id
              AND coord.id = p_user_id
        )
        INTO v_allowed;
    ELSIF v_actor_role = 'student' AND p_related_type = 'club' THEN
        SELECT EXISTS (
            SELECT 1
            FROM public.clubs c
            JOIN public.profiles coord
              ON coord.club_id = c.id
             AND coord.role = 'coordinator'
            WHERE c.id = p_related_id
              AND coord.id = p_user_id
        )
        INTO v_allowed;
    END IF;

    IF NOT v_allowed THEN
        RAISE EXCEPTION 'Not allowed to create this notification.';
    END IF;

    INSERT INTO public.notifications (
        user_id,
        type,
        title,
        message,
        related_id,
        related_type
    )
    VALUES (
        p_user_id,
        p_type,
        COALESCE(NULLIF(trim(p_title), ''), 'Notification'),
        p_message,
        p_related_id,
        p_related_type
    )
    RETURNING id INTO v_notification_id;

    RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Chat schema alignment
ALTER TABLE public.chats
    ADD COLUMN IF NOT EXISTS title text;

CREATE TABLE IF NOT EXISTS public.chat_members (
    chat_id uuid REFERENCES public.chats(id) ON DELETE CASCADE,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    role text DEFAULT 'member',
    joined_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
    muted_until timestamptz,
    PRIMARY KEY (chat_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_members_user_id
    ON public.chat_members(user_id);

ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_members ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
    chat_policy record;
    message_policy record;
    member_policy record;
BEGIN
    FOR chat_policy IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'chats'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.chats', chat_policy.policyname);
    END LOOP;

    FOR message_policy IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'messages'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.messages', message_policy.policyname);
    END LOOP;

    FOR member_policy IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'chat_members'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.chat_members', member_policy.policyname);
    END LOOP;
END $$;

CREATE POLICY "Admins have full access to chats"
ON public.chats
FOR ALL
USING (
    EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid()
          AND role = 'admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid()
          AND role = 'admin'
    )
);

CREATE POLICY "Coordinators can view club and event chats"
ON public.chats
FOR SELECT
USING (
    EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid()
          AND role = 'coordinator'
    )
    AND (
        type = 'broadcast'
        OR (type = 'direct' AND id IN (SELECT chat_id FROM public.chat_members WHERE user_id = auth.uid()))
        OR (type = 'club' AND reference_id IN (SELECT club_id FROM public.profiles WHERE id = auth.uid()))
        OR (
            type = 'event'
            AND reference_id IN (
                SELECT id
                FROM public.events
                WHERE club_id IN (SELECT club_id FROM public.profiles WHERE id = auth.uid())
            )
        )
    )
);

CREATE POLICY "Users can view authorized chats"
ON public.chats
FOR SELECT
USING (
    type = 'broadcast'
    OR (type = 'direct' AND id IN (SELECT chat_id FROM public.chat_members WHERE user_id = auth.uid()))
    OR (
        type = 'club'
        AND reference_id IN (
            SELECT club_id
            FROM public.club_memberships
            WHERE user_id = auth.uid()
              AND status IN ('approved', 'core_member', 'sub_coordinator')
        )
    )
    OR (
        type = 'event'
        AND reference_id IN (
            SELECT event_id
            FROM public.registrations
            WHERE user_id = auth.uid()
              AND status IN ('registered', 'confirmed', 'attended')
        )
    )
);

CREATE POLICY "Admins can create chats"
ON public.chats
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid()
          AND role = 'admin'
    )
);

CREATE POLICY "Coordinators can create chats for managed contexts"
ON public.chats
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.role = 'coordinator'
          AND (
              type = 'broadcast'
              OR (type = 'club' AND reference_id = p.club_id)
              OR (
                  type = 'event'
                  AND EXISTS (
                      SELECT 1
                      FROM public.events e
                      WHERE e.id = reference_id
                        AND e.club_id = p.club_id
                  )
              )
          )
    )
);

CREATE POLICY "Users can view members of chats they are in"
ON public.chat_members
FOR SELECT
USING (
    user_id = auth.uid()
    OR EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid()
          AND role IN ('admin', 'coordinator')
    )
);

CREATE POLICY "Mods can manage chat members"
ON public.chat_members
FOR ALL
USING (
    EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid()
          AND role IN ('admin', 'coordinator')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid()
          AND role IN ('admin', 'coordinator')
    )
);

CREATE POLICY "Admins have full access to messages"
ON public.messages
FOR ALL
USING (
    EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid()
          AND role = 'admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid()
          AND role = 'admin'
    )
);

CREATE POLICY "Users can view messages in authorized chats"
ON public.messages
FOR SELECT
USING (
    chat_id IN (
        SELECT id
        FROM public.chats
        WHERE
            type = 'broadcast'
            OR (type = 'direct' AND id IN (SELECT chat_id FROM public.chat_members WHERE user_id = auth.uid()))
            OR (
                type = 'club'
                AND reference_id IN (
                    SELECT club_id
                    FROM public.club_memberships
                    WHERE user_id = auth.uid()
                      AND status IN ('approved', 'core_member', 'sub_coordinator')
                )
            )
            OR (
                type = 'club'
                AND reference_id IN (
                    SELECT club_id
                    FROM public.profiles
                    WHERE id = auth.uid()
                      AND role = 'coordinator'
                )
            )
            OR (
                type = 'event'
                AND reference_id IN (
                    SELECT event_id
                    FROM public.registrations
                    WHERE user_id = auth.uid()
                      AND status IN ('registered', 'confirmed', 'attended')
                )
            )
            OR (
                type = 'event'
                AND reference_id IN (
                    SELECT id
                    FROM public.events
                    WHERE club_id IN (
                        SELECT club_id
                        FROM public.profiles
                        WHERE id = auth.uid()
                          AND role = 'coordinator'
                    )
                )
            )
    )
);

CREATE POLICY "Users can insert messages in valid chats"
ON public.messages
FOR INSERT
WITH CHECK (
    sender_id = auth.uid()
    AND chat_id IN (
        SELECT id
        FROM public.chats
        WHERE
            (type = 'direct' AND id IN (SELECT chat_id FROM public.chat_members WHERE user_id = auth.uid()))
            OR (
                type = 'club'
                AND reference_id IN (
                    SELECT club_id
                    FROM public.club_memberships
                    WHERE user_id = auth.uid()
                      AND status IN ('approved', 'core_member', 'sub_coordinator')
                )
            )
            OR (
                type = 'club'
                AND reference_id IN (
                    SELECT club_id
                    FROM public.profiles
                    WHERE id = auth.uid()
                      AND role = 'coordinator'
                )
            )
            OR (
                type = 'event'
                AND reference_id IN (
                    SELECT event_id
                    FROM public.registrations
                    WHERE user_id = auth.uid()
                      AND status IN ('registered', 'confirmed', 'attended')
                )
            )
            OR (
                type = 'event'
                AND reference_id IN (
                    SELECT id
                    FROM public.events
                    WHERE club_id IN (
                        SELECT club_id
                        FROM public.profiles
                        WHERE id = auth.uid()
                          AND role = 'coordinator'
                    )
                )
            )
            OR (
                type = 'broadcast'
                AND EXISTS (
                    SELECT 1
                    FROM public.profiles
                    WHERE id = auth.uid()
                      AND role IN ('admin', 'coordinator')
                )
            )
    )
);

CREATE POLICY "Users can update their own messages"
ON public.messages
FOR UPDATE
USING (sender_id = auth.uid())
WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Coordinators can moderate club event messages"
ON public.messages
FOR UPDATE
USING (
    EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid()
          AND role = 'coordinator'
    )
    AND chat_id IN (
        SELECT id
        FROM public.chats
        WHERE
            (type = 'club' AND reference_id IN (SELECT club_id FROM public.profiles WHERE id = auth.uid()))
            OR (
                type = 'event'
                AND reference_id IN (
                    SELECT id
                    FROM public.events
                    WHERE club_id IN (SELECT club_id FROM public.profiles WHERE id = auth.uid())
                )
            )
    )
)
WITH CHECK (true);

-- Realtime coverage for multi-session sync
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.chats REPLICA IDENTITY FULL;
ALTER TABLE public.messages REPLICA IDENTITY FULL;

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
