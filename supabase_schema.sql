-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- RESET DATABASE (Drop existing tables to avoid conflicts)
drop table if exists public.messages cascade;
drop table if exists public.chat_rooms cascade;
drop table if exists public.notifications cascade;
drop table if exists public.user_notification_preferences cascade;
drop table if exists public.feedback cascade;
drop table if exists public.certificates cascade;
drop table if exists public.results cascade;
drop table if exists public.team_members cascade;
drop table if exists public.teams cascade;
drop table if exists public.registrations cascade;
drop table if exists public.club_memberships cascade;
drop table if exists public.events cascade;
drop table if exists public.clubs cascade;
drop table if exists public.profiles cascade;

-- ROLES ENUM (No changes needed to auth.users schema directly)
-- alter table auth.users add column if not exists raw_user_meta_data jsonb; -- REMOVED: Managed by Supabase

-- TABLE 1: PROFILES
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text unique not null,
  full_name text,
  department text,
  year int,
  role text check (role in ('admin', 'coordinator', 'student')) default 'student',
  avatar_url text,
  account_status text check (account_status in ('active', 'blocked', 'suspended')) default 'active',
  login_history jsonb default '[]'::jsonb,
  last_login timestamp with time zone,
  club_id uuid, -- For coordinators
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- TABLE 1B: LOGIN LOGS
create table public.login_logs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  login_time timestamp with time zone default timezone('utc'::text, now()) not null,
  ip_address text,
  device_info text
);


-- TABLE 1C: CLUB CATEGORIES
create table public.club_categories (
  id uuid default uuid_generate_v4() primary key,
  name text not null unique,
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- TABLE 2: CLUBS
create table public.clubs (
  id uuid default uuid_generate_v4() primary key,
  name text not null unique,
  description text,
  logo_url text,
  banner_url text,
  founded_year int,
  contact_email text,
  status text check (status in ('active', 'inactive', 'suspended', 'archived')) default 'active',
  visibility boolean default true,
  category_id uuid references public.club_categories(id) on delete set null,
  is_accepting_members boolean default true,
  allow_event_creation boolean default true,
  allow_external_participants boolean default false,
  max_members int,
  department_restriction text[],
  year_restriction int[],
  auto_approve_memberships boolean default false,
  require_questionnaire boolean default false,
  coordinator_id uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Constraint: Link profile club_id to clubs table
alter table public.profiles
  add constraint fk_profiles_club
  foreign key (club_id) references public.clubs(id)
  on delete set null;

-- TABLE 3: EVENTS
create table public.events (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  description text,
  event_type text check (event_type in ('normal', 'hackathon')) not null default 'normal',
  date timestamp with time zone not null,
  venue text,
  club_id uuid references public.clubs(id) on delete cascade not null,
  created_by uuid references public.profiles(id) on delete set null,
  registration_deadline timestamp with time zone,
  max_participants int,
  status text check (status in ('draft', 'open', 'closed', 'completed')) default 'draft',
  approval_status text check (approval_status in ('pending', 'approved', 'rejected')) default 'pending',
  poster_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- TABLE 4: REGISTRATIONS
create table public.registrations (
  id uuid default uuid_generate_v4() primary key,
  event_id uuid references public.events(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  status text check (status in ('registered', 'cancelled')) default 'registered',
  attendance_status text check (attendance_status in ('present', 'absent')) default 'absent',
  attendance_method text check (attendance_method in ('manual', 'qr')) default 'manual',
  registered_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (event_id, user_id)
);

-- TABLE 5: TEAMS (For Hackathons)
create table public.teams (
  id uuid default uuid_generate_v4() primary key,
  event_id uuid references public.events(id) on delete cascade not null,
  team_name text not null,
  leader_id uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (event_id, team_name)
);

-- TABLE 6: TEAM_MEMBERS
create table public.team_members (
  team_id uuid references public.teams(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (team_id, user_id)
);

-- TABLE 7: RESULTS
create table public.results (
  id uuid default uuid_generate_v4() primary key,
  event_id uuid references public.events(id) on delete cascade not null,
  team_id uuid references public.teams(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  position int check (position > 0),
  score numeric,
  remarks text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- TABLE 8: CERTIFICATES
create table public.certificates (
  id uuid default uuid_generate_v4() primary key,
  event_id uuid references public.events(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  certificate_url text not null,
  issued_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (event_id, user_id)
);

-- TABLE 9: USER_NOTIFICATION_PREFERENCES
create table public.user_notification_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  email_enabled boolean default true,
  event_reminders_enabled boolean default true,
  chat_enabled boolean default true,
  membership_enabled boolean default true,
  system_enabled boolean default true,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- TABLE 10: NOTIFICATIONS
create table public.notifications (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  type text not null check (type in ('event', 'membership', 'attendance', 'result', 'certificate', 'chat', 'system', 'announcement', 'alert', 'success', 'info')),
  title text not null,
  message text not null,
  related_id uuid,
  related_type text,
  is_read boolean default false,
  delivered boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_user_notification_prefs_userid on public.user_notification_preferences(user_id);
create index if not exists idx_notifications_user_id on public.notifications(user_id);
create index if not exists idx_notifications_unread on public.notifications(user_id) where is_read = false;

-- TABLE 11: CHAT_ROOMS
create table public.chat_rooms (
  id uuid default uuid_generate_v4() primary key,
  event_id uuid references public.events(id) on delete cascade,
  team_id uuid references public.teams(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  check (
    (event_id is not null and team_id is null) or
    (event_id is null and team_id is not null)
  )
);

-- TABLE 11: MESSAGES
create table public.messages (
  id uuid default uuid_generate_v4() primary key,
  room_id uuid references public.chat_rooms(id) on delete cascade not null,
  sender_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ENABLE ROW LEVEL SECURITY
alter table public.profiles enable row level security;
alter table public.clubs enable row level security;
alter table public.events enable row level security;
alter table public.registrations enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.results enable row level security;
alter table public.certificates enable row level security;
alter table public.notifications enable row level security;
alter table public.user_notification_preferences enable row level security;
alter table public.chat_rooms enable row level security;
alter table public.messages enable row level security;
alter table public.login_logs enable row level security;


-- POLICIES

-- PROFILES
create policy "Public profiles are viewable by everyone." on public.profiles for select using (true);
create policy "Users can update own profile." on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile." on public.profiles for insert with check (auth.uid() = id);

-- LOGIN LOGS
create policy "Users can view own login logs." on public.login_logs for select using (auth.uid() = user_id);
create policy "Admins can view all login logs." on public.login_logs for select using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
create policy "System can insert login logs." on public.login_logs for insert with check (auth.uid() = user_id);


-- CLUBS & CATEGORIES
create policy "Categories are viewable by everyone." on public.club_categories for select using (true);
create policy "Admins can manage categories." on public.club_categories for all using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "Clubs are viewable by everyone." on public.clubs for select using (
  visibility = true 
  OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'coordinator'))
);
create policy "Admins can insert clubs." on public.clubs for insert with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
create policy "Admins can update clubs." on public.clubs for update using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
create policy "Admins can delete clubs." on public.clubs for delete using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- EVENTS
create policy "Events are viewable by everyone." on public.events for select using (true);
create policy "Coordinators can insert events for their club." on public.events for insert with check (
  exists (
    select 1 from public.profiles
    where id = auth.uid() 
      and role = 'coordinator' 
      and club_id = public.events.club_id
  ) or exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  )
);
create policy "Coordinators can update their own club events." on public.events for update using (
  exists (
    select 1 from public.profiles
    where id = auth.uid() 
      and role = 'coordinator' 
      and club_id = public.events.club_id
  ) or exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  )
);

-- REGISTRATIONS
create policy "Users can view own registrations." on public.registrations for select using (auth.uid() = user_id);
create policy "Users can check registrations for event." on public.registrations for select using (
  exists (
    select 1 from public.events e
    join public.profiles p on p.club_id = e.club_id
    where e.id = public.registrations.event_id and p.id = auth.uid() and p.role = 'coordinator'
  ) OR 
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);
create policy "Students can register themselves." on public.registrations for insert with check (auth.uid() = user_id);
create policy "Coordinators can manage registrations." on public.registrations for all using (
  exists (
    select 1 from public.events e
    join public.profiles p on p.club_id = e.club_id
    where e.id = public.registrations.event_id and p.id = auth.uid() and p.role = 'coordinator'
  ) OR 
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- TEAMS
create policy "Teams are viewable by everyone." on public.teams for select using (true);
create policy "Students can create teams." on public.teams for insert with check (auth.uid() = leader_id);
create policy "Team leaders can update teams." on public.teams for update using (auth.uid() = leader_id);

-- TEAM MEMBERS
create policy "Team members are viewable by everyone." on public.team_members for select using (true);
create policy "Students can join teams." on public.team_members for insert with check (auth.uid() = user_id);
create policy "Students can leave teams." on public.team_members for delete using (auth.uid() = user_id);

-- RESULTS
create policy "Results are viewable by everyone." on public.results for select using (true);
create policy "Coordinators can insert results." on public.results for insert with check (
  exists (
    select 1 from public.events e
    join public.profiles p on p.club_id = e.club_id
    where e.id = public.results.event_id and p.id = auth.uid() and p.role = 'coordinator'
  ) OR 
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- CERTIFICATES
create policy "Users can view own certificates." on public.certificates for select using (auth.uid() = user_id);
create policy "Coordinators/Admins can generate certificates." on public.certificates for insert with check (
  exists (
    select 1 from public.events e
    join public.profiles p on p.club_id = e.club_id
    where e.id = public.certificates.event_id and p.id = auth.uid() and p.role = 'coordinator'
  ) OR 
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- NOTIFICATION PREFERENCES
create policy "Users can view their own preferences" 
  on public.user_notification_preferences for select 
  using (auth.uid() = user_id);

create policy "Users can update their own preferences" 
  on public.user_notification_preferences for update 
  using (auth.uid() = user_id);

create policy "Users can insert their own preferences" 
  on public.user_notification_preferences for insert 
  with check (auth.uid() = user_id);

-- NOTIFICATIONS
create policy "Users can view their own notifications" 
  on public.notifications for select 
  using (auth.uid() = user_id);

create policy "Users can update their own notifications (read status)" 
  on public.notifications for update 
  using (auth.uid() = user_id);

create policy "Admins can insert notifications for anyone" 
  on public.notifications for insert 
  with check (
    exists (
      select 1 from public.profiles 
      where id = auth.uid() and role = 'admin'
    )
    or auth.uid() = user_id
  );

-- TABLE: FEEDBACK
create table public.feedback (
  id uuid default uuid_generate_v4() primary key,
  event_id uuid references public.events(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  rating int check (rating >= 1 and rating <= 5) not null,
  comment text,
  anonymous boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (event_id, user_id)
);

-- RLS Policies for Feedback
alter table public.feedback enable row level security;

create policy "Users can submit feedback for attended events"
  on public.feedback for insert
  with check (
    auth.uid() = user_id AND
    exists (
      select 1 from public.registrations
      where event_id = feedback.event_id
      and user_id = auth.uid()
      and attendance_status = 'present'
    )
  );

create policy "Users can see their own feedback"
  on public.feedback for select
  using (auth.uid() = user_id);

create policy "Coordinators can see feedback for their club events"
  on public.feedback for select
  using (
    exists (
      select 1 from public.events e
      join public.profiles p on p.club_id = e.club_id
      where e.id = feedback.event_id
      and p.id = auth.uid()
      and p.role = 'coordinator'
    )
  );

create policy "Admins can see all feedback"
  on public.feedback for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
      and role = 'admin'
    )
  );

-- TABLE: CLUB MEMBERSHIPS
create table public.club_memberships (
  id uuid default uuid_generate_v4() primary key,
  club_id uuid references public.clubs(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  status text check (status in ('pending', 'approved', 'rejected', 'removed', 'left', 'suspended')) default 'pending',
  role text check (role in ('member', 'core_member', 'sub_coordinator', 'volunteer')) default 'member',
  removed_at timestamp with time zone,
  removal_reason text,
  approved_by uuid references public.profiles(id) on delete set null,
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()),
  unique (club_id, user_id)
);

-- RLS for CLUB MEMBERSHIPS
alter table public.club_memberships enable row level security;

create policy "Users can view own memberships." on public.club_memberships for select using (auth.uid() = user_id);
create policy "Coordinators can view memberships for their club." on public.club_memberships for select using (
  exists (
    select 1 from public.profiles
    where id = auth.uid() 
      and role = 'coordinator' 
      and club_id = public.club_memberships.club_id
  )
);
create policy "Admins can view all memberships." on public.club_memberships for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);
create policy "Students can request to join a club." on public.club_memberships for insert with check (
  auth.uid() = user_id 
  and status = 'pending' 
  and exists (select 1 from public.profiles where id = auth.uid() and account_status = 'active')
);
create policy "Students can leave a club." on public.club_memberships for update using (auth.uid() = user_id) with check (status = 'left');
create policy "Coordinators can manage their club memberships." on public.club_memberships for update using (
  exists (
    select 1 from public.profiles
    where id = auth.uid() 
      and role = 'coordinator' 
      and club_id = public.club_memberships.club_id
  )
  OR exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);
create policy "Coordinators can remove members for their club." on public.club_memberships for delete using (
  exists (
    select 1 from public.profiles
    where id = auth.uid() 
      and role = 'coordinator' 
      and club_id = public.club_memberships.club_id
  )
);

-- MESSAGE INDEXES
create index if not exists idx_messages_room_id on public.messages(room_id);
create index if not exists idx_messages_sender_id on public.messages(sender_id);

-- ADD MESSAGE TYPE
alter table public.messages add column if not exists message_type text default 'text';

-- SYSTEM SETTINGS
create table if not exists public.system_settings (
  id uuid default uuid_generate_v4() primary key,
  key text unique not null,
  value jsonb not null,
  description text,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);
