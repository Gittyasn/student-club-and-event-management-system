-- ==============================================================================
-- MODULE 15: ENTERPRISE CHAT & COMMUNICATION ENGINE
-- Migration Version: 20260302
-- Features: Club chats, Event chats, Direct Messages, Broadcasts, Threads, Attachments
-- ==============================================================================

-- 1. CHATS TABLE
-- Represents a chat room/channel/conversation.
CREATE TABLE IF NOT EXISTS public.chats (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    type text NOT NULL CHECK (type IN ('club', 'event', 'broadcast', 'direct')),
    reference_id uuid, -- club_id for 'club', event_id for 'event', null for 'broadcast', null for 'direct'
    title text, -- Optional title, especially useful for group DMs or custom rooms
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Index for fast lookup by reference
CREATE INDEX IF NOT EXISTS idx_chats_reference_id ON public.chats(reference_id);
CREATE INDEX IF NOT EXISTS idx_chats_type ON public.chats(type);

-- 2. CHAT MEMBERS TABLE
-- Used for explicit access control (Direct Messages or Private Group Chats).
-- Club/Event chats rely on `club_memberships` and `registrations` dynamically.
CREATE TABLE IF NOT EXISTS public.chat_members (
    chat_id uuid REFERENCES public.chats(id) ON DELETE CASCADE,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    joined_at timestamptz DEFAULT now(),
    muted_until timestamptz, -- Moderation or personal preference
    PRIMARY KEY (chat_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_members_user ON public.chat_members(user_id);

-- 3. MESSAGES TABLE
-- Core messaging table with threading, pinning, and attachments.
CREATE TABLE IF NOT EXISTS public.messages (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    chat_id uuid NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
    sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content text, -- Text content, can be null if it's just a file upload
    file_url text, -- Supabase Storage URL
    file_type text, -- 'image', 'pdf', 'document'
    file_name text,
    is_announcement boolean DEFAULT false,
    is_pinned boolean DEFAULT false,
    deleted boolean DEFAULT false,
    parent_id uuid REFERENCES public.messages(id) ON DELETE CASCADE, -- For threaded replies
    created_at timestamptz DEFAULT now(),
    edited_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON public.messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_parent_id ON public.messages(parent_id);

-- Enable RLS
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- RLS POLICIES FOR CHATS
-- ==============================================================================

-- Admins: Have full access to all chats
CREATE POLICY "Admins have full access to chats" ON public.chats
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    ) WITH CHECK (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Coordinators: Can view chats linked to their club
CREATE POLICY "Coordinators can view club and event chats" ON public.chats
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coordinator')
        AND (
            (type = 'club' AND reference_id IN (SELECT club_id FROM profiles WHERE id = auth.uid())) OR
            (type = 'event' AND reference_id IN (SELECT id FROM events WHERE club_id IN (SELECT club_id FROM profiles WHERE id = auth.uid()))) OR
            (type = 'broadcast') OR
            (type = 'direct' AND id IN (SELECT chat_id FROM chat_members WHERE user_id = auth.uid()))
        )
    );

-- Students: Can view chats they have explicit/implicit access to
CREATE POLICY "Users can view authorized chats" ON public.chats
    FOR SELECT USING (
        (type = 'broadcast') OR
        (type = 'direct' AND id IN (SELECT chat_id FROM chat_members WHERE user_id = auth.uid())) OR
        (type = 'club' AND reference_id IN (SELECT club_id FROM club_memberships WHERE user_id = auth.uid() AND status = 'approved')) OR
        (type = 'event' AND reference_id IN (SELECT event_id FROM registrations WHERE user_id = auth.uid() AND status = 'registered'))
    );


-- ==============================================================================
-- RLS POLICIES FOR CHAT MEMBERS
-- ==============================================================================
CREATE POLICY "Users can view members of chats they are in" ON public.chat_members
    FOR SELECT USING (
        chat_id IN (
            -- direct chats the user is in
            SELECT chat_id FROM chat_members WHERE user_id = auth.uid()
        )
        OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'coordinator'))
    );

-- Enable inserting for admins/coordinators (direct messaging setup)
CREATE POLICY "Mods can manage chat members" ON public.chat_members
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'coordinator'))
    );


-- ==============================================================================
-- RLS POLICIES FOR MESSAGES
-- ==============================================================================

-- Admins: Full access
CREATE POLICY "Admins have full access to messages" ON public.messages
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    ) WITH CHECK (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- View Messages: Users can see messages if they can see the chat
CREATE POLICY "Users can view messages in authorized chats" ON public.messages
    FOR SELECT USING (
        chat_id IN (
            SELECT id FROM public.chats WHERE
                (type = 'broadcast') OR
                (type = 'direct' AND id IN (SELECT chat_id FROM chat_members WHERE user_id = auth.uid())) OR
                (type = 'club' AND reference_id IN (SELECT club_id FROM club_memberships WHERE user_id = auth.uid() AND status = 'approved')) OR
                (type = 'club' AND reference_id IN (SELECT club_id FROM profiles WHERE id = auth.uid() AND role = 'coordinator')) OR
                (type = 'event' AND reference_id IN (SELECT event_id FROM registrations WHERE user_id = auth.uid() AND status = 'registered')) OR
                (type = 'event' AND reference_id IN (SELECT id FROM events WHERE club_id IN (SELECT club_id FROM profiles WHERE id = auth.uid() AND role = 'coordinator')))
        )
    );

-- Send Messages: Users can insert messages in authorized chats
-- Note: Broadcast is restricted to admin/coordinator
CREATE POLICY "Users can insert messages in valid chats" ON public.messages
    FOR INSERT WITH CHECK (
        sender_id = auth.uid() AND
        chat_id IN (
            SELECT id FROM public.chats WHERE
                (type = 'direct' AND id IN (SELECT chat_id FROM chat_members WHERE user_id = auth.uid())) OR
                (type = 'club' AND reference_id IN (SELECT club_id FROM club_memberships WHERE user_id = auth.uid() AND status = 'approved')) OR
                (type = 'club' AND reference_id IN (SELECT club_id FROM profiles WHERE id = auth.uid() AND role = 'coordinator')) OR
                (type = 'event' AND reference_id IN (SELECT event_id FROM registrations WHERE user_id = auth.uid() AND status = 'registered')) OR
                (type = 'event' AND reference_id IN (SELECT id FROM events WHERE club_id IN (SELECT club_id FROM profiles WHERE id = auth.uid() AND role = 'coordinator'))) OR
                (type = 'broadcast' AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'coordinator')))
        )
    );

-- Update Own Messages: Allow users to edit or soft-delete their own messages (but not pin/announcement)
CREATE POLICY "Users can update their own messages" ON public.messages
    FOR UPDATE USING (
        sender_id = auth.uid()
    ) WITH CHECK (
        sender_id = auth.uid()
        -- Prevent regular users from tampering with is_announcement or is_pinned flags?
        -- For simplicity, since RLS doesn't easily restrict column updates conditionally without a trigger,
        -- we just allow the update and handle specific locks in the UI for non-mods,
        -- but for robust security, a trigger is better. 
    );

-- Coordinators Can Moderate: Delete or pin messages in their respective club/event
CREATE POLICY "Coordinators can moderate club/event messages" ON public.messages
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coordinator') AND
        chat_id IN (
            SELECT id FROM public.chats WHERE
                (type = 'club' AND reference_id IN (SELECT club_id FROM profiles WHERE id = auth.uid() AND role = 'coordinator')) OR
                (type = 'event' AND reference_id IN (SELECT id FROM events WHERE club_id IN (SELECT club_id FROM profiles WHERE id = auth.uid() AND role = 'coordinator')))
        )
    );

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
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid()
          AND role = 'admin'
    )
    INTO is_admin;

    SELECT EXISTS (
        SELECT 1
        FROM public.chats c
        JOIN public.profiles p ON p.id = auth.uid()
        WHERE p.role = 'coordinator'
          AND c.id = OLD.chat_id
          AND (
              (c.type = 'club' AND c.reference_id = p.club_id) OR
              (c.type = 'event' AND c.reference_id IN (
                  SELECT e.id
                  FROM public.events e
                  WHERE e.club_id = p.club_id
              ))
          )
    )
    INTO is_coordinator_moderator;

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
    FOR EACH ROW
    EXECUTE FUNCTION public.guard_message_update();

-- ==============================================================================
-- BROADCAST PUSH FUNCTION
-- ==============================================================================
-- Function for Admins to easily push a broadcast message
CREATE OR REPLACE FUNCTION public.create_broadcast_message(content text, file_url text DEFAULT NULL, file_name text DEFAULT NULL)
RETURNS uuid AS $$
DECLARE
    broadcast_chat_id uuid;
    msg_id uuid;
BEGIN
    -- Ensure broadcast chat exists
    SELECT id INTO broadcast_chat_id FROM public.chats WHERE type = 'broadcast' LIMIT 1;
    
    IF broadcast_chat_id IS NULL THEN
        INSERT INTO public.chats (type, title) VALUES ('broadcast', 'Campus Announcements') RETURNING id INTO broadcast_chat_id;
    END IF;

    -- Insert message
    INSERT INTO public.messages (chat_id, sender_id, content, file_url, file_name, is_announcement)
    VALUES (broadcast_chat_id, auth.uid(), content, file_url, file_name, true)
    RETURNING id INTO msg_id;

    RETURN msg_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Enable Realtime for messaging
-- Check if realtime publication exists, if not create it
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime FOR ALL TABLES;
  ELSE
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chats;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
END $$;
