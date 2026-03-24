-- Migration: Add admin_remarks and submission tracking to events
-- Date: Feb 22, 2026

alter table public.events add column if not exists admin_remarks text;
alter table public.events add column if not exists submitted_at timestamp with time zone;
alter table public.events add column if not exists approved_at timestamp with time zone;

-- Ensure RLS allows coordinators to update status to 'open' when submitting
-- (Usually handled by generic update policy, but good to check)
