-- Migration: Club Management Blueprint
-- Description: Adds categories, lifecycle fields, and visibility controls to clubs.

-- 1. Create Club Categories Table
CREATE TABLE IF NOT EXISTS public.club_categories (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  description text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insert default categories
INSERT INTO public.club_categories (name, description) VALUES
  ('Technical', 'Technology and engineering focused clubs'),
  ('Cultural', 'Arts, music, dance and cultural activities'),
  ('Sports', 'Athletics and sports teams'),
  ('Entrepreneurship', 'Business and startup focused groups'),
  ('Social Service', 'Community service and volunteering'),
  ('Academic', 'Subject-specific academic clubs'),
  ('Arts', 'Creative and performing arts')
ON CONFLICT (name) DO NOTHING;

-- 2. Expand Clubs Table
ALTER TABLE public.clubs 
  ADD COLUMN IF NOT EXISTS banner_url text,
  ADD COLUMN IF NOT EXISTS founded_year int,
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS status text CHECK (status IN ('active', 'inactive', 'suspended', 'archived')) DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS visibility boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.club_categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_accepting_members boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_event_creation boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_external_participants boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS coordinator_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Enable RLS on categories
ALTER TABLE public.club_categories ENABLE ROW LEVEL SECURITY;

-- 3. Update RLS Policies

-- Categories
DROP POLICY IF EXISTS "Categories are viewable by everyone." ON public.club_categories;
CREATE POLICY "Categories are viewable by everyone." ON public.club_categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage categories." ON public.club_categories;
CREATE POLICY "Admins can manage categories." ON public.club_categories FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Clubs (Update visibility rules)
DROP POLICY IF EXISTS "Clubs are viewable by everyone." ON public.clubs;
-- Only show visible clubs to students, admins/coordinators can see all
CREATE POLICY "Clubs are viewable by everyone." ON public.clubs FOR SELECT USING (
  visibility = true 
  OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'coordinator'))
);

-- Events (Check if club allows event creation)
DROP POLICY IF EXISTS "Coordinators can insert events for their club." ON public.events;
CREATE POLICY "Coordinators can insert events for their club." ON public.events FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.clubs c ON c.id = p.club_id
    WHERE p.id = auth.uid() 
      AND p.role = 'coordinator' 
      AND p.club_id = public.events.club_id
      AND c.allow_event_creation = true
      AND c.status = 'active'
  ) OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Memberships (Check if club is accepting members)
DROP POLICY IF EXISTS "Students can request to join a club." ON public.club_memberships;
CREATE POLICY "Students can request to join a club." ON public.club_memberships FOR INSERT WITH CHECK (
  auth.uid() = user_id 
  AND status = 'pending'
  AND EXISTS (
    SELECT 1 FROM public.clubs 
    WHERE id = club_id 
      AND is_accepting_members = true
      AND status = 'active'
  )
);
