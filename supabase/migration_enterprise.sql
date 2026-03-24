-- ============================================================
-- ENTERPRISE UPGRADE MIGRATION
-- Run this in your Supabase SQL Editor (safe, additive only)
-- ============================================================

-- ── CLUBS ENHANCEMENTS ──────────────────────────────────────
alter table public.clubs
  add column if not exists category text default 'General',
  add column if not exists status text check (status in ('active', 'inactive')) default 'active',
  add column if not exists banner_url text,
  add column if not exists coordinator_id uuid references public.profiles(id) on delete set null,
  add column if not exists rating numeric default 0,
  add column if not exists updated_at timestamp with time zone default timezone('utc'::text, now());

-- ── EVENTS ENHANCEMENTS ──────────────────────────────────────
alter table public.events
  add column if not exists mode text check (mode in ('online', 'offline', 'hybrid')) default 'offline',
  add column if not exists budget numeric default 0,
  add column if not exists rejection_reason text,
  add column if not exists category text default 'General',
  add column if not exists is_paid boolean default false,
  add column if not exists ticket_price numeric default 0;

-- ── REGISTRATIONS ENHANCEMENTS ──────────────────────────────
alter table public.registrations
  add column if not exists payment_status text check (payment_status in ('free', 'pending', 'paid')) default 'free',
  add column if not exists qr_code text,
  add column if not exists waitlisted boolean default false,
  add column if not exists created_at timestamp with time zone default timezone('utc'::text, now());

-- ── CERTIFICATES ENHANCEMENTS ──────────────────────────────
alter table public.certificates
  add column if not exists verification_token uuid default uuid_generate_v4(),
  add column if not exists qr_code_url text,
  add column if not exists template_id text default 'default',
  add column if not exists certificate_type text check (certificate_type in ('participation', 'winner', 'merit')) default 'participation';

-- Make verification_token unique for QR lookups
create unique index if not exists idx_certificates_verification_token 
  on public.certificates(verification_token);

-- ── RESULTS ENHANCEMENTS ──────────────────────────────────
alter table public.results
  add column if not exists prize text,
  add column if not exists disqualified boolean default false;

-- ── TABLE: AUDIT_LOGS ────────────────────────────────────────
-- Create if not exists (in case it was never created)
create table if not exists public.audit_logs (
  id uuid default uuid_generate_v4() primary key,
  action text not null,
  target_table text,
  target_id uuid,
  meta jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add columns that may be missing (safe to run multiple times)
alter table public.audit_logs
  add column if not exists actor_id uuid references public.profiles(id) on delete set null;

alter table public.audit_logs enable row level security;

-- Drop existing policies before re-creating (avoids "already exists" errors)
drop policy if exists "Admins can view all audit logs." on public.audit_logs;
drop policy if exists "System can insert audit logs." on public.audit_logs;
drop policy if exists "Authenticated users can insert audit logs." on public.audit_logs;

create policy "Admins can view all audit logs."
  on public.audit_logs for select
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "Authenticated users can insert audit logs."
  on public.audit_logs for insert
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
      and role in ('admin', 'coordinator')
    )
  );

create index if not exists idx_audit_logs_actor_id on public.audit_logs(actor_id);
create index if not exists idx_audit_logs_created_at on public.audit_logs(created_at);

-- ── TABLE: BUDGET_ITEMS ─────────────────────────────────────
create table if not exists public.budget_items (
  id uuid default uuid_generate_v4() primary key,
  club_id uuid references public.clubs(id) on delete cascade,
  event_id uuid references public.events(id) on delete cascade,
  label text not null,
  amount numeric not null default 0,
  type text check (type in ('income', 'expense')) not null default 'expense',
  approved boolean default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.budget_items enable row level security;

-- Drop existing policies before re-creating
drop policy if exists "Coordinators can manage budget for their club." on public.budget_items;
drop policy if exists "Admins can view all budget items." on public.budget_items;

create policy "Coordinators can manage budget for their club."
  on public.budget_items for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'coordinator' and p.club_id = public.budget_items.club_id
    ) or
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins can view all budget items."
  on public.budget_items for select
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- ── INDEXES for performance ──────────────────────────────────
create index if not exists idx_clubs_category on public.clubs(category);
create index if not exists idx_clubs_status on public.clubs(status);
create index if not exists idx_events_category on public.events(category);
create index if not exists idx_events_mode on public.events(mode);
create index if not exists idx_registrations_waitlisted on public.registrations(waitlisted);

-- ── CLUB RATING TRIGGER ──────────────────────────────────────
-- Auto-updates club.rating from avg feedback when feedback is submitted
create or replace function public.update_club_rating()
returns trigger as $$
begin
  update public.clubs
  set rating = (
    select coalesce(avg(f.rating), 0)
    from public.feedback f
    join public.events e on e.id = f.event_id
    where e.club_id = (
      select club_id from public.events where id = NEW.event_id
    )
  )
  where id = (
    select club_id from public.events where id = NEW.event_id
  );
  return NEW;
end;
$$ language plpgsql security definer;

drop trigger if exists on_feedback_update_club_rating on public.feedback;
create trigger on_feedback_update_club_rating
  after insert or update on public.feedback
  for each row execute procedure public.update_club_rating();