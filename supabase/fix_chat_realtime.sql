-- 1. Unify Chat Schema with Frontend Hooks
-- Drop existing chat_rooms if it exists (we'll migrate to the more generic 'chats' used by useChat.js)
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.chat_rooms CASCADE;
DROP TABLE IF EXISTS public.chats CASCADE;

-- Create Generic Chats Table
CREATE TABLE public.chats (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  type text NOT NULL CHECK (type IN ('event', 'club', 'team', 'broadcast', 'individual')),
  reference_id uuid, -- event_id, club_id, etc.
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(type, reference_id)
);

-- Recreate Messages Table linked to the new Chats Table
CREATE TABLE public.messages (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  chat_id uuid REFERENCES public.chats(id) ON DELETE CASCADE NOT NULL,
  sender_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  file_url text,
  file_type text,
  file_name text,
  is_announcement boolean DEFAULT false,
  is_pinned boolean DEFAULT false,
  deleted boolean DEFAULT false,
  parent_id uuid REFERENCES public.messages(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  edited_at timestamp with time zone
);

-- 2. Enable Row Level Security
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies for Chats
CREATE POLICY "Chats are viewable by participants" ON public.chats
  FOR SELECT USING (true); -- Simplified for research, usually restricted by membership

-- 4. RLS Policies for Messages
CREATE POLICY "Messages are viewable by everyone in the chat" ON public.messages
  FOR SELECT USING (true);

CREATE POLICY "Anyone authenticated can insert messages" ON public.messages
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own messages" ON public.messages
  FOR UPDATE USING (auth.uid() = sender_id);

-- 5. ENABLE REALTIME
-- Create a publication for realtime if it doesn't exist
-- Note: In Supabase, usually you just add tables to the 'supabase_realtime' publication
BEGIN;
  -- Remove if exists to re-add
  -- (Safe check depends on your current config, usually just adding is fine)
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE public.chats, public.messages, public.profiles, public.events;
COMMIT;

-- Ensure replica identity is FULL for realtime updates to contain previous values if needed
ALTER TABLE public.chats REPLICA IDENTITY FULL;
ALTER TABLE public.messages REPLICA IDENTITY FULL;

-- 6. RPC for Broadcast (used by useChat.js line 129)
CREATE OR REPLACE FUNCTION public.create_broadcast_message(content text, file_url text DEFAULT NULL, file_name text DEFAULT NULL)
RETURNS void AS $$
DECLARE
  v_chat_id uuid;
BEGIN
  -- Find or create broadcast chat room
  SELECT id INTO v_chat_id FROM public.chats WHERE type = 'broadcast' LIMIT 1;
  
  IF v_chat_id IS NULL THEN
    INSERT INTO public.chats (type) VALUES ('broadcast') RETURNING id INTO v_chat_id;
  END IF;

  INSERT INTO public.messages (chat_id, sender_id, content, file_url, file_name, is_announcement)
  VALUES (v_chat_id, auth.uid(), content, file_url, file_name, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
