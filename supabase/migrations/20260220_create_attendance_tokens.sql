-- Create attendance_tokens table to support QR-based attendance
CREATE TABLE IF NOT EXISTS public.attendance_tokens (
  token uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  event_id uuid references public.events(id) on delete cascade not null,
  created_by uuid references auth.users(id) on delete set null,
  expires_at timestamp with time zone,
  used boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Index for faster lookup
CREATE INDEX IF NOT EXISTS idx_attendance_tokens_event_id ON public.attendance_tokens(event_id);
