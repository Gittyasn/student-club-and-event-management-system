-- Create Club Memberships Table
create table if not exists club_memberships (
  id uuid default gen_random_uuid() primary key,
  club_id uuid references clubs(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  status text check (status in ('pending', 'approved', 'rejected')) default 'pending',
  joined_at timestamp with time zone default now() not null,
  unique(club_id, user_id)
);

-- Enable RLS
alter table club_memberships enable row level security;

-- Policies

-- 1. Admins: Full access
create policy "Admins can do everything on memberships"
  on club_memberships for all
  using (
    exists (
      select 1 from profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- 2. Coordinators: Manage their own club
-- Relationship: Coordinator's profile has the club_id
create policy "Coordinators can view memberships for their club"
  on club_memberships for select
  using (
    exists (
      select 1 from profiles
      where id = auth.uid() 
      and role = 'coordinator' 
      and club_id = club_memberships.club_id
    )
  );

create policy "Coordinators can update memberships for their club"
  on club_memberships for update
  using (
    exists (
      select 1 from profiles
      where id = auth.uid() 
      and role = 'coordinator' 
      and club_id = club_memberships.club_id
    )
  );

-- 3. Students: View own, Insert pending
create policy "Users can view own memberships"
  on club_memberships for select
  using (auth.uid() = user_id);

create policy "Users can insert pending membership"
  on club_memberships for insert
  with check (auth.uid() = user_id and status = 'pending');
