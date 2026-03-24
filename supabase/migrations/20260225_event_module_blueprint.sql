-- Database Migration for Event Management Module Blueprint (20260225)

-- 1. Create event_categories table
CREATE TABLE IF NOT EXISTS public.event_categories (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    name text NOT NULL UNIQUE,
    description text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insert some default categories
INSERT INTO public.event_categories (name, description) VALUES
('Workshop', 'Educational sessions focused on practical skills'),
('Seminar', 'Lectures or presentations on specific topics'),
('Hackathon', 'Intensive coding or project development competitions'),
('Competition', 'General contests and challenges'),
('Cultural Event', 'Arts, music, and cultural performances'),
('Sports Event', 'Athletic competitions and tournaments'),
('Awareness Program', 'Campaigns to raise awareness on social or technical issues'),
('Technical Training', 'Deep dive technical training sessions'),
('Social Gathering', 'Networking and social meetups'),
('Other', 'Any other type of event')
ON CONFLICT (name) DO NOTHING;

-- 2. Modify events table
-- Add new columns
ALTER TABLE public.events 
    ADD COLUMN IF NOT EXISTS short_description text,
    ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.event_categories(id),
    ADD COLUMN IF NOT EXISTS mode text CHECK (mode IN ('online', 'offline', 'hybrid')) DEFAULT 'offline',
    ADD COLUMN IF NOT EXISTS location text,
    ADD COLUMN IF NOT EXISTS meeting_link text,
    ADD COLUMN IF NOT EXISTS start_time timestamp with time zone,
    ADD COLUMN IF NOT EXISTS end_time timestamp with time zone,
    ADD COLUMN IF NOT EXISTS allow_waitlist boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS visibility text CHECK (visibility IN ('public', 'members_only', 'private', 'hidden')) DEFAULT 'public',
    ADD COLUMN IF NOT EXISTS requires_membership boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS certificate_enabled boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS result_required boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS rank_based_certificates boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS budget_requested numeric DEFAULT 0,
    ADD COLUMN IF NOT EXISTS expense_estimate numeric DEFAULT 0,
    ADD COLUMN IF NOT EXISTS rejection_reason text,
    ADD COLUMN IF NOT EXISTS archived_at timestamp with time zone;

-- Migrate data from date to start_time if start_time is null
UPDATE public.events SET start_time = date WHERE start_time IS NULL AND date IS NOT NULL;
UPDATE public.events SET end_time = date + interval '2 hours' WHERE end_time IS NULL AND date IS NOT NULL;

-- Remove old constraint on status before adding new one
ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_status_check;

-- Ensure existing statuses are valid under the new constraint 
UPDATE public.events SET status = 'draft' WHERE status IS NULL OR status NOT IN ('draft', 'pending', 'approved', 'registration_open', 'registration_closed', 'ongoing', 'completed', 'cancelled', 'archived');

-- Add new constraint for detailed lifecycle
ALTER TABLE public.events ADD CONSTRAINT events_status_check 
    CHECK (status IN ('draft', 'pending', 'approved', 'registration_open', 'registration_closed', 'ongoing', 'completed', 'cancelled', 'archived'));

-- 3. Create event_logs table
CREATE TABLE IF NOT EXISTS public.event_logs (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
    changed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    change_type text NOT NULL,
    previous_state jsonb,
    new_state jsonb,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Set up RLS Policies

-- Event Categories policies
ALTER TABLE public.event_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Categories are viewable by everyone." ON public.event_categories;
CREATE POLICY "Categories are viewable by everyone." ON public.event_categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage event categories." ON public.event_categories;
CREATE POLICY "Admins can manage event categories." ON public.event_categories FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Event Logs policies
ALTER TABLE public.event_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins and Coordinators can view logs" ON public.event_logs;
CREATE POLICY "Admins and Coordinators can view logs" ON public.event_logs FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'coordinator'))
);

DROP POLICY IF EXISTS "Can insert event logs" ON public.event_logs;
CREATE POLICY "Can insert event logs" ON public.event_logs FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'coordinator'))
);

-- Event policies updates
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Drop existing SELECT policy to replace it with a stricter visibility policy
DROP POLICY IF EXISTS "Events are viewable by everyone." ON public.events;
DROP POLICY IF EXISTS "Events viewable according to rules" ON public.events;

CREATE POLICY "Events viewable according to rules" ON public.events FOR SELECT USING (
    -- Admins see all
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') 
    OR 
    -- Coordinators see club events or public events
    (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'coordinator' AND club_id = public.events.club_id))
    OR
    -- Students view rules
    (
        status IN ('approved', 'registration_open', 'registration_closed', 'ongoing', 'completed', 'cancelled')
        AND visibility != 'hidden'
        AND (
            visibility = 'public' 
            OR 
            (visibility = 'members_only' AND EXISTS (
                SELECT 1 FROM public.club_memberships WHERE club_id = public.events.club_id AND user_id = auth.uid() AND status IN ('approved', 'core_member', 'sub_coordinator')
            ))
            OR
            (visibility = 'private' AND EXISTS (
                SELECT 1 FROM public.registrations WHERE event_id = public.events.id AND user_id = auth.uid()
            ))
        )
    )
);

-- Ensure old modify policies are gone
DROP POLICY IF EXISTS "Coordinators can insert events for their club." ON public.events;
DROP POLICY IF EXISTS "Coordinators can update their own club events." ON public.events;
DROP POLICY IF EXISTS "Coordinators can delete their own club events." ON public.events;
DROP POLICY IF EXISTS "Admins can insert events." ON public.events;
DROP POLICY IF EXISTS "Admins can update events." ON public.events;
DROP POLICY IF EXISTS "Admins can delete events." ON public.events;

-- Redefine modify policies
CREATE POLICY "Coordinators can insert events for their club." ON public.events FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'coordinator' AND club_id = public.events.club_id
  )
);

CREATE POLICY "Coordinators can update their own club events." ON public.events FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'coordinator' AND club_id = public.events.club_id
  )
);

-- Prevent unauthorized deletion
CREATE POLICY "Coordinators can delete draft events." ON public.events FOR DELETE USING (
  status = 'draft' AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'coordinator' AND club_id = public.events.club_id
  )
);

CREATE POLICY "Admins have full access to events" ON public.events FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
