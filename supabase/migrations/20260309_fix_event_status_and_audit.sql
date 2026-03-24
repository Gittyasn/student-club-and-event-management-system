-- Migration: Fix Event Status Constraints, Audit Logging, and Login Logs Consistency
-- File: 20260309_fix_event_status_and_audit.sql

-- 1. Fix Event Status Check Constraint
ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_status_check;

ALTER TABLE public.events ADD CONSTRAINT events_status_check 
    CHECK (status IN ('draft', 'pending', 'approved', 'rejected', 'registration_open', 'registration_closed', 'ongoing', 'completed', 'cancelled', 'archived'));

-- 2. Coordinate Audit Logs table with both legacy and new security fields
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'audit_logs') THEN
        CREATE TABLE public.audit_logs (
            id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
            actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
            user_id UUID REFERENCES auth.users(id), -- legacy field
            action TEXT NOT NULL,
            module TEXT,
            target_table TEXT,
            target_id UUID,
            old_value JSONB,
            new_value JSONB,
            meta JSONB,
            ip_address TEXT,
            details JSONB, -- legacy field
            timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- legacy field
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    ELSE
        -- Add missing columns if they don't exist
        ALTER TABLE public.audit_logs 
            ADD COLUMN IF NOT EXISTS actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
            ADD COLUMN IF NOT EXISTS target_table TEXT,
            ADD COLUMN IF NOT EXISTS target_id UUID,
            ADD COLUMN IF NOT EXISTS old_value JSONB,
            ADD COLUMN IF NOT EXISTS new_value JSONB,
            ADD COLUMN IF NOT EXISTS meta JSONB,
            ADD COLUMN IF NOT EXISTS ip_address TEXT,
            ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- 3. Fix Login Logs Consistency
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'login_logs') THEN
        -- Add or rename columns to support both legacy and new security module
        ALTER TABLE public.login_logs 
            ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
            ADD COLUMN IF NOT EXISTS email TEXT,
            ADD COLUMN IF NOT EXISTS status TEXT CHECK (status IN ('success', 'failed', 'blocked', 'suspicious')) DEFAULT 'success',
            ADD COLUMN IF NOT EXISTS user_agent TEXT,
            ADD COLUMN IF NOT EXISTS failure_reason TEXT,
            ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
            
        -- Sync data if needed
        UPDATE public.login_logs SET profile_id = user_id WHERE profile_id IS NULL AND user_id IS NOT NULL;
        UPDATE public.login_logs SET user_agent = device_info WHERE user_agent IS NULL AND device_info IS NOT NULL;
        UPDATE public.login_logs SET created_at = login_time WHERE created_at IS NULL AND login_time IS NOT NULL;
    ELSE
        CREATE TABLE public.login_logs (
            id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
            email TEXT,
            status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'blocked', 'suspicious')),
            ip_address TEXT,
            user_agent TEXT,
            profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
            user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- legacy
            login_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- legacy
            device_info TEXT, -- legacy
            failure_reason TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    END IF;
END $$;

-- 4. Ensure Certificate Logs table exists
CREATE TABLE IF NOT EXISTS public.certificate_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    certificate_id UUID REFERENCES public.certificates(id) ON DELETE SET NULL,
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL, -- 'generated', 'regenerated', 'revoked', 'locked', 'downloaded', 'verified'
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Done.
