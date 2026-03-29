-- Comprehensive Fix for Profiles Table Schema
-- Paste and run this in your Supabase SQL Editor.

-- 1. Ensure all columns exist with correct types
DO $$
BEGIN
    -- full_name
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'full_name') THEN
        ALTER TABLE public.profiles ADD COLUMN full_name text;
    END IF;

    -- department
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'department') THEN
        ALTER TABLE public.profiles ADD COLUMN department text;
    END IF;

    -- year
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'year') THEN
        ALTER TABLE public.profiles ADD COLUMN year int;
    END IF;

    -- role
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'role') THEN
        ALTER TABLE public.profiles ADD COLUMN role text CHECK (role IN ('admin', 'coordinator', 'student')) DEFAULT 'student';
    END IF;

    -- account_status
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'account_status') THEN
        ALTER TABLE public.profiles ADD COLUMN account_status text CHECK (account_status IN ('active', 'blocked', 'suspended')) DEFAULT 'active';
    END IF;

    -- club_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'club_id') THEN
        ALTER TABLE public.profiles ADD COLUMN club_id uuid;
    END IF;

    -- login_history
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'login_history') THEN
        ALTER TABLE public.profiles ADD COLUMN login_history jsonb DEFAULT '[]'::jsonb;
    END IF;

    -- last_login
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'last_login') THEN
        ALTER TABLE public.profiles ADD COLUMN last_login timestamp with time zone;
    END IF;
END $$;

-- 2. Ensure RLS is enabled and policies exist
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile." ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for users to create their own profile" ON public.profiles;

CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile." ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- 3. Force refresh the PostgREST schema cache
NOTIFY pgrst, 'reload schema';
