-- Add is_sub_coordinator flag to club_memberships to allow coordinators to assign sub-coordinators
ALTER TABLE public.club_memberships
  ADD COLUMN IF NOT EXISTS is_sub_coordinator boolean DEFAULT false;

-- No additional policy changes required because coordinators can update their club's memberships.
