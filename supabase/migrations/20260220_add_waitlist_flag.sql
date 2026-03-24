-- Add is_waitlisted flag to registrations to support waitlist management
ALTER TABLE public.registrations
  ADD COLUMN IF NOT EXISTS is_waitlisted boolean DEFAULT false;

-- Optional: index
CREATE INDEX IF NOT EXISTS idx_registrations_waitlist ON public.registrations(is_waitlisted);
