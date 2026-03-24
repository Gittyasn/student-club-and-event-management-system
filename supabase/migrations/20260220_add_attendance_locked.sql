-- Add attendance_locked column to events to allow locking attendance after event ends
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS attendance_locked boolean DEFAULT false;

-- Ensure column is available for RLS checks and UI logic
-- No further actions required here; deploy this migration in Supabase SQL editor.
