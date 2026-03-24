-- HACKATHON MODULE MIGRATION

-- 1. HACKATHON ROUNDS
create table if not exists public.hackathon_rounds (
  id uuid default uuid_generate_v4() primary key,
  event_id uuid references public.events(id) on delete cascade not null,
  round_name text not null,
  round_number int not null,
  status text check (status in ('pending', 'active', 'completed')) default 'pending',
  criteria jsonb, -- Scoring criteria for this round
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (event_id, round_number)
);

-- 2. HACKATHON JUDGES
create table if not exists public.hackathon_judges (
  id uuid default uuid_generate_v4() primary key,
  event_id uuid references public.events(id) on delete cascade not null,
  judge_id uuid references public.profiles(id) on delete cascade not null,
  weight numeric default 1.0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (event_id, judge_id)
);

-- 3. ENHANCE TEAMS TABLE
alter table public.events add column if not exists min_team_size int default 1;
alter table public.events add column if not exists max_team_size int default 5;

alter table public.teams add column if not exists college_dept text;
alter table public.teams add column if not exists team_email text;
alter table public.teams add column if not exists current_round_id uuid references public.hackathon_rounds(id) on delete set null;
alter table public.teams add column if not exists status text check (status in ('active', 'disqualified', 'eliminated')) default 'active';

-- 4. HACKATHON SUBMISSIONS
create table if not exists public.hackathon_submissions (
  id uuid default uuid_generate_v4() primary key,
  team_id uuid references public.teams(id) on delete cascade not null,
  round_id uuid references public.hackathon_rounds(id) on delete cascade not null,
  title text not null,
  description text,
  github_link text,
  demo_link text,
  presentation_url text,
  additional_docs text[],
  submitted_at timestamp with time zone default timezone('utc'::text, now()) not null,
  is_locked boolean default false,
  unique (team_id, round_id)
);

-- 5. HACKATHON SCORES
create table if not exists public.hackathon_scores (
  id uuid default uuid_generate_v4() primary key,
  submission_id uuid references public.hackathon_submissions(id) on delete cascade not null,
  judge_id uuid references public.profiles(id) on delete cascade not null,
  scores jsonb not null, -- { "technical": 8, "presentation": 9, ... }
  total_score numeric,
  remarks text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()),
  unique (submission_id, judge_id)
);

-- 6. AUDIT LOGS FOR ANTI-CHEATING
create table if not exists public.hackathon_audit_logs (
  id uuid default uuid_generate_v4() primary key,
  event_id uuid references public.events(id) on delete cascade not null,
  action_type text not null, -- 'submission_edit', 'score_tamper', 'status_change'
  user_id uuid references public.profiles(id) on delete set null,
  details jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ENABLE RLS
alter table public.hackathon_rounds enable row level security;
alter table public.hackathon_judges enable row level security;
alter table public.hackathon_submissions enable row level security;
alter table public.hackathon_scores enable row level security;
alter table public.hackathon_audit_logs enable row level security;

-- RLS POLICIES

-- Hackathon Rounds
create policy "Rounds are viewable by everyone" on public.hackathon_rounds for select using (true);
create policy "Coordinators and Admins can manage rounds" on public.hackathon_rounds for all using (
  exists (
    select 1 from public.events e
    join public.profiles p on p.club_id = e.club_id
    where e.id = public.hackathon_rounds.event_id and p.id = auth.uid() and (p.role = 'coordinator' or p.role = 'admin')
  )
);

-- Hackathon Judges
create policy "Judges are viewable by everyone" on public.hackathon_judges for select using (true);
create policy "Coordinators and Admins can manage judges" on public.hackathon_judges for all using (
  exists (
    select 1 from public.events e
    join public.profiles p on p.club_id = e.club_id
    where e.id = public.hackathon_judges.event_id and p.id = auth.uid() and (p.role = 'coordinator' or p.role = 'admin')
  )
);

-- Submissions
create policy "Submissions are viewable by team members and judges" on public.hackathon_submissions for select using (
  exists (select 1 from public.team_members where team_id = public.hackathon_submissions.team_id and user_id = auth.uid())
  or exists (
    select 1 from public.hackathon_judges j
    join public.hackathon_rounds r on r.event_id = j.event_id
    where r.id = public.hackathon_submissions.round_id and j.judge_id = auth.uid()
  )
  or exists (select 1 from public.profiles where id = auth.uid() and (role = 'coordinator' or role = 'admin'))
);

create policy "Team leaders can submit" on public.hackathon_submissions for insert with check (
  exists (select 1 from public.teams where id = team_id and leader_id = auth.uid())
  and not is_locked
);

create policy "Team leaders can update submissions before locking" on public.hackathon_submissions for update using (
  exists (select 1 from public.teams where id = team_id and leader_id = auth.uid())
  and not is_locked
);

-- Scores
create policy "Judges can view their own scores" on public.hackathon_scores for select using (judge_id = auth.uid());
create policy "Coordinators and Admins can view all scores" on public.hackathon_scores for select using (
  exists (select 1 from public.profiles where id = auth.uid() and (role = 'coordinator' or role = 'admin'))
);

create policy "Judges can insert scores" on public.hackathon_scores for insert with check (
  judge_id = auth.uid()
  and exists (
    select 1 from public.hackathon_judges j
    join public.hackathon_rounds r on r.event_id = j.event_id
    join public.hackathon_submissions s on s.round_id = r.id
    where s.id = submission_id and j.judge_id = auth.uid()
  )
);

create policy "Judges can update scores" on public.hackathon_scores for update using (
  judge_id = auth.uid()
);

-- Audit Logs
create policy "Only Admins and Coordinators can view logs" on public.hackathon_audit_logs for select using (
  exists (select 1 from public.profiles where id = auth.uid() and (role = 'coordinator' or role = 'admin'))
);
