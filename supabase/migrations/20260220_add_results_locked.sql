-- Add results_locked column to events to prevent edits after publishing
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS results_locked boolean DEFAULT false;
