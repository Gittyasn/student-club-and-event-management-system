-- Migration: Add attendance_records table and supporting indexes/policies
-- Date: Feb 22, 2026

create table if not exists public.attendance_records (
  id uuid default uuid_generate_v4() primary key,
  event_id uuid references public.events(id) on delete cascade,
  registration_id uuid references public.registrations(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  status text check (status in ('present','absent','late')) not null,
  method text check (method in ('qr','manual','bulk')) not null default 'manual',
  marked_at timestamp with time zone default timezone('utc'::text, now()) not null,
  marked_by uuid references public.profiles(id) on delete set null,
  notes text
);

create index if not exists idx_attendance_event_id on public.attendance_records(event_id);
create index if not exists idx_attendance_registration_id on public.attendance_records(registration_id);
create index if not exists idx_attendance_user_id on public.attendance_records(user_id);

-- RLS: allow admins to view all, coordinators to view for their club events
alter table public.attendance_records enable row level security;

create policy "Admins can view attendance records" on public.attendance_records for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

create policy "Coordinators can view attendance for their clubs' events" on public.attendance_records for select using (
  exists (
    select 1 from public.profiles p
    join public.clubs c on c.coordinator_id = p.id
    where p.id = auth.uid() and c.id = (select club_id from public.events where id = public.attendance_records.event_id)
  )
);

create policy "Students can view their own attendance records" on public.attendance_records for select using (
  user_id = auth.uid()
);

-- Allow inserts for authenticated users (registrations must exist)
create policy "Authenticated users can insert their own attendance records" on public.attendance_records for insert with check (
  (user_id = auth.uid()) OR (exists (select 1 from public.profiles where id = auth.uid() and role in ('coordinator','admin')))
);
