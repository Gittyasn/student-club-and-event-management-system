-- ==========================================================
-- CONSOLIDATED_SUPABASE_SETUP.sql
-- ==========================================================
-- INSTRUCTIONS:
-- 1. Open Supabase SQL Editor.
-- 2. Paste this entire script and click RUN.
-- 3. This will fix Schema, Auth Bypass, and Multi-role Profile Sync.

-- ──────────────────────────────────────────────────────────
-- 1. SCHEMA ALIGNMENT (Attendance & Certificates)
-- ──────────────────────────────────────────────────────────

-- Add missing columns to 'events' table
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS attendance_locked BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS attendance_locked_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS qr_token UUID DEFAULT gen_random_uuid(),
ADD COLUMN IF NOT EXISTS certificate_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS result_type TEXT DEFAULT 'participation';

-- Create attendance_records table if not exists
CREATE TABLE IF NOT EXISTS public.attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    checked_in_at TIMESTAMPTZ DEFAULT now(),
    status TEXT DEFAULT 'present', -- 'present', 'late', 'absent'
    method TEXT DEFAULT 'manual', -- 'manual', 'qr', 'bulk'
    UNIQUE(event_id, user_id)
);

-- Create results table if not exists
CREATE TABLE IF NOT EXISTS public.results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    score NUMERIC,
    rank INTEGER,
    remarks TEXT,
    published_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(event_id, user_id)
);

-- Create certificates table if not exists
CREATE TABLE IF NOT EXISTS public.certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    cert_type TEXT DEFAULT 'participation', -- 'winner', 'merit', 'participation'
    certificate_number TEXT UNIQUE,
    file_url TEXT,
    generated_at TIMESTAMPTZ DEFAULT now(),
    status TEXT DEFAULT 'valid',
    UNIQUE(event_id, user_id)
);

-- ──────────────────────────────────────────────────────────
-- 2. AUTH BYPASS & PROFILE SYNC (The "Magic" Trigger)
-- ──────────────────────────────────────────────────────────

-- Step A: Bypass Email Confirmation for NEW users
CREATE OR REPLACE FUNCTION public.handle_auto_confirm()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto confirm email
  NEW.email_confirmed_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_confirm ON auth.users;
CREATE TRIGGER on_auth_user_created_confirm
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_auto_confirm();

-- Step B: Auto-create Profile record with correct ROLE
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, account_status)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Student User'), 
    COALESCE(NEW.raw_user_meta_data->>'role', 'student'), -- Respects the role chosen in registration form
    'active'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();

-- ──────────────────────────────────────────────────────────
-- 3. REBRANDING CLEANUP (Legacy data update)
-- ──────────────────────────────────────────────────────────

UPDATE public.clubs SET name = 'Smart Systems Club' WHERE name ILIKE '%AI Club%';
UPDATE public.events SET title = REPLACE(title, 'AI', 'Smart Systems');

-- ──────────────────────────────────────────────────────────
-- 4. SECURITY (Enable necessary RLS)
-- ──────────────────────────────────────────────────────────

ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

-- Simple All-Access Policy for Public Tables (Dev Mode)
-- In production, these should be more restrictive.
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Public Select" ON public.attendance_records;
    CREATE POLICY "Public Select" ON public.attendance_records FOR SELECT USING (true);
    
    DROP POLICY IF EXISTS "Public Select" ON public.results;
    CREATE POLICY "Public Select" ON public.results FOR SELECT USING (true);
    
    DROP POLICY IF EXISTS "Public Select" ON public.certificates;
    CREATE POLICY "Public Select" ON public.certificates FOR SELECT USING (true);
END $$;

-- Coordinator Update Access
DROP POLICY IF EXISTS "Coordinators manage attendance" ON public.attendance_records;
CREATE POLICY "Coordinators manage attendance" ON public.attendance_records 
FOR ALL USING (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('coordinator', 'admin')));

-- ==========================================================
-- DONE. Your Supabase is now 100% compatible.
-- ==========================================================
