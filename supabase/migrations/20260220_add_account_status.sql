-- Migration: Add account_status column if missing and reload schema cache
-- Run this in your Supabase SQL Editor to fix the 'account_status' missing error.

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'account_status') THEN
        ALTER TABLE public.profiles ADD COLUMN account_status text CHECK (account_status IN ('active', 'blocked', 'suspended')) DEFAULT 'active';
    END IF;
END $$;

-- This command attempts to reload the PostgREST schema cache
-- Note: This might require higher permissions or might happen automatically after the DDL change
NOTIFY pgrst, 'reload schema';
