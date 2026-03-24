-- Migration: Add missing fields and enhance tables for full club/event management
-- Date: Feb 21, 2026

-- ADD MISSING FIELDS TO CLUBS TABLE
alter table public.clubs add column if not exists category text check (category in (
  'academic', 'cultural', 'sports', 'professional', 'technical', 'creative', 'social'
)) default 'academic';

alter table public.clubs add column if not exists status text check (status in ('active', 'inactive', 'suspended')) default 'active';

alter table public.clubs add column if not exists banner_url text;

alter table public.clubs add column if not exists coordinator_id uuid references public.profiles(id) on delete set null;

alter table public.clubs add column if not exists rating numeric(3,2) default 0 check (rating >= 0 and rating <= 5);

alter table public.clubs add column if not exists member_count int default 0;

alter table public.clubs add column if not exists updated_at timestamp with time zone default timezone('utc'::text, now());

-- ADD MISSING FIELDS TO EVENTS TABLE
alter table public.events add column if not exists mode text check (mode in ('online', 'offline', 'hybrid')) default 'offline';

alter table public.events add column if not exists budget_request numeric default 0;

alter table public.events add column if not exists category text check (category in (
  'hackathon', 'workshop', 'competition', 'seminar', 'talk', 'social', 'cultural', 'sports', 'contest'
)) default 'workshop';

alter table public.events add column if not exists location text;

alter table public.events add column if not exists is_paid boolean default false;

alter table public.events add column if not exists fee numeric default 0;

alter table public.events add column if not exists contact_person text;

alter table public.events add column if not exists contact_email text;

alter table public.events add column if not exists contact_phone text;

alter table public.events add column if not exists qr_token text unique;

alter table public.events add column if not exists updated_at timestamp with time zone default timezone('utc'::text, now());

-- ADD ATTENDANCE TRACKING FIELDS TO REGISTRATIONS
alter table public.registrations add column if not exists qr_scanned_at timestamp with time zone;

alter table public.registrations add column if not exists certificate_issued boolean default false;

alter table public.registrations add column if not exists score numeric;

-- ADD AUDIT LOG TABLE
create table if not exists public.audit_logs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  old_values jsonb,
  new_values jsonb,
  ip_address text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.audit_logs enable row level security;

create policy "Admins can view audit logs." on public.audit_logs for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- INDEXES FOR PERFORMANCE
create index if not exists idx_clubs_category on public.clubs(category);
create index if not exists idx_clubs_status on public.clubs(status);
create index if not exists idx_clubs_coordinator_id on public.clubs(coordinator_id);
create index if not exists idx_events_club_id on public.events(club_id);
create index if not exists idx_events_status on public.events(status);
create index if not exists idx_events_approval_status on public.events(approval_status);
create index if not exists idx_events_date on public.events(date);
create index if not exists idx_registrations_event_id on public.registrations(event_id);
create index if not exists idx_registrations_user_id on public.registrations(user_id);
create index if not exists idx_club_memberships_club_id on public.club_memberships(club_id);
create index if not exists idx_club_memberships_user_id on public.club_memberships(user_id);
create index if not exists idx_club_memberships_status on public.club_memberships(status);
create index if not exists idx_feedback_event_id on public.feedback(event_id);
create index if not exists idx_audit_logs_user_id on public.audit_logs(user_id);

-- UPDATE MODIFY POLICIES FOR RLS
-- Allow coordinators to view their club details
create policy "Coordinators can view their club details." on public.clubs for select using (
  exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'coordinator' and club_id = public.clubs.id
  )
);

-- Allow coordinators to update their club
create policy "Coordinators can update their own club." on public.clubs for update using (
  exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'coordinator' and club_id = public.clubs.id
  )
);

-- Feedback table updates
create policy "Users can view all feedback for attended events" on public.feedback for select using (true);
