-- COMPREHENSIVE SEED DATA: Clubs, Memberships, Events, and Test Accounts
-- Generated: Feb 21, 2026

-- ============================================================
-- 1. SEED CLUB DATA - 20 Clubs across 4 Categories
-- ============================================================

-- Academic & Technical Clubs
insert into public.clubs (name, description, category, status, rating, member_count) values
('Coding Club', 'Master coding through hackathons, coding contests, and debugging battles. Learn competitive programming and collaborative development.', 'academic', 'active', 4.7, 245),
('AI & Data Science Club', 'Explore machine learning, AI seminars, and Kaggle competitions. Build real-world AI solutions.', 'academic', 'active', 4.6, 187),
('Robotics Club', 'Build robots and compete in tech expos. Learn robotics design, control systems, and automation.', 'technical', 'active', 4.8, 156),
('Electronics Club', 'Circuit design workshops and hardware hackathons. Get hands-on with circuit design and electronics.', 'technical', 'active', 4.5, 128),
('Mathematics Club', 'Math quizzes and problem-solving contests. Sharpen your mathematical thinking.', 'academic', 'active', 4.3, 98),
('Research & Innovation Club', 'Paper presentations and project expos. Showcase research and innovative ideas.', 'academic', 'active', 4.4, 112),

-- Cultural Clubs
('Dance Club', 'Solo dance, group performances, and flash mobs. Express yourself through dance.', 'cultural', 'active', 4.8, 203),
('Music Club', 'Singing competitions, battle of the bands, and open mic nights.', 'cultural', 'active', 4.7, 189),
('Drama Club', 'Street plays, stage plays, and acting workshops. Explore theatrical arts.', 'cultural', 'active', 4.6, 164),
('Fine Arts Club', 'Painting competitions, poster making, and art exhibitions.', 'cultural', 'active', 4.5, 135),
('Photography Club', 'Photo walks, photography contests, and exhibitions. Capture moments.', 'cultural', 'active', 4.6, 178),

-- Sports Clubs
('Cricket Club', 'Inter-college tournaments and friendly matches. Cricket excellence.', 'sports', 'active', 4.8, 156),
('Football Club', 'League matches and penalty shootout contests. Championship football.', 'sports', 'active', 4.7, 143),
('Basketball Club', '3v3 tournaments and inter-department matches. Basketball passion.', 'sports', 'active', 4.6, 128),
('Table Tennis Club', 'Singles and doubles tournaments. Precision and skill.', 'sports', 'active', 4.4, 87),
('Athletics Club', 'Marathon events and track & field competitions. Athletic excellence.', 'sports', 'active', 4.5, 171),

-- Professional & Career Clubs
('Entrepreneurship Club', 'Startup pitch competitions and business plan contests. Build your venture.', 'professional', 'active', 4.6, 145),
('Management Club', 'Case study competitions and group discussions. Business acumen.', 'professional', 'active', 4.5, 119),
('Finance Club', 'Stock market workshops and investment quizzes. Financial literacy.', 'professional', 'active', 4.6, 132),
('Public Speaking Club', 'Debate competitions and speech contests. Master public speaking.', 'professional', 'active', 4.7, 156);

-- ============================================================
-- 2. CREATE TEST ACCOUNTS (Admin, Coordinators, Students)
-- ============================================================

-- IMPORTANT: These must be created via Supabase Auth interface first
-- This is placeholder for reference - in real implementation, use Supabase dashboard

-- Admin Account
-- Email: admin@university.edu
-- Password: AdminPass@2026
-- Role: admin

-- Coordinator Accounts (one per category)
-- Email: coord.coding@university.edu
-- Password: CoordPass@2026

-- Student Accounts (test users)
-- Email: student.john@university.edu
-- Password: StudentPass@2026

-- ============================================================
-- 3. SEED COORDINATOR ASSIGNMENTS
-- ============================================================

-- Note: First get the actual UUIDs from auth.users after creating accounts
-- Then use INSERT statements like:
-- update public.clubs set coordinator_id = 'uuid' where name = 'Coding Club';

-- ============================================================
-- 4. SAMPLE EVENTS FOR NEXT 3 MONTHS
-- ============================================================

-- *** IMPORTANT: Replace 'club-id' and 'user-id' with actual UUIDs from your database ***

-- Coding Club Events
insert into public.events (
  title, description, club_id, created_by, date, venue, 
  max_participants, registration_deadline, status, approval_status,
  category, mode, location, budget_request, contact_person, contact_email
) 
select 
  'Hackathon 2026', 
  '24-hour coding marathon. Build innovative solutions. Prizes worth $5000.',
  id,
  (select id from public.profiles where role = 'admin' limit 1),
  timezone('utc'::text, now()) + interval '15 days',
  'Main Campus - Tech Building',
  150,
  timezone('utc'::text, now()) + interval '10 days',
  'draft',
  'pending',
  'hackathon',
  'offline',
  'Tech Building Auditorium',
  5000,
  'Rahul Singh',
  'rahul@coding-club.edu'
from public.clubs where name = 'Coding Club' limit 1;

insert into public.events (
  title, description, club_id, created_by, date, venue,
  max_participants, registration_deadline, status, approval_status,
  category, mode, location, budget_request, contact_person, contact_email
)
select
  'Competitive Programming Contest',
  'Online round-based competition. 3 hours, 5 problems. Compete nationally.',
  id,
  (select id from public.profiles where role = 'admin' limit 1),
  timezone('utc'::text, now()) + interval '22 days',
  'Online',
  500,
  timezone('utc'::text, now()) + interval '18 days',
  'draft',
  'pending',
  'contest',
  'online',
  'Online Platform',
  1000,
  'Priya Sharma',
  'priya@coding-club.edu'
from public.clubs where name = 'Coding Club' limit 1;

-- AI & Data Science Club Events
insert into public.events (
  title, description, club_id, created_by, date, venue,
  max_participants, registration_deadline, status, approval_status,
  category, mode, location, budget_request, contact_person, contact_email
)
select
  'Machine Learning Workshop',
  'Hands-on ML workshop covering neural networks, classification, and deployment.',
  id,
  (select id from public.profiles where role = 'admin' limit 1),
  timezone('utc'::text, now()) + interval '10 days',
  'Computer Lab A',
  60,
  timezone('utc'::text, now()) + interval '5 days',
  'draft',
  'pending',
  'workshop',
  'offline',
  'Computer Lab A',
  2000,
  'Dr. Anil Kumar',
  'anil@ai-club.edu'
from public.clubs where name = 'AI & Data Science Club' limit 1;

-- Robotics Club Events
insert into public.events (
  title, description, club_id, created_by, date, venue,
  max_participants, registration_deadline, status, approval_status,
  category, mode, location, budget_request, contact_person, contact_email
)
select
  'Robot Building Competition',
  'Design and build autonomous robots. Compete in various challenges.',
  id,
  (select id from public.profiles where role = 'admin' limit 1),
  timezone('utc'::text, now()) + interval '30 days',
  'Tech Expo Ground',
  80,
  timezone('utc'::text, now()) + interval '25 days',
  'draft',
  'pending',
  'competition',
  'offline',
  'Tech Expo Ground',
  8000,
  'Prof. Rajesh Patel',
  'rajesh@robotics-club.edu'
from public.clubs where name = 'Robotics Club' limit 1;

-- Dance Club Events
insert into public.events (
  title, description, club_id, created_by, date, venue,
  max_participants, registration_deadline, status, approval_status,
  category, mode, location, budget_request, contact_person, contact_email
)
select
  'Spring Dance Festival',
  'Showcase your talent in solo and group categories. Prize pool: $3000.',
  id,
  (select id from public.profiles where role = 'admin' limit 1),
  timezone('utc'::text, now()) + interval '35 days',
  'Main Auditorium',
  200,
  timezone('utc'::text, now()) + interval '28 days',
  'draft',
  'pending',
  'cultural',
  'offline',
  'Main Auditorium',
  3000,
  'Kavya Sharma',
  'kavya@dance-club.edu'
from public.clubs where name = 'Dance Club' limit 1;

-- Music Club Events
insert into public.events (
  title, description, club_id, created_by, date, venue,
  max_participants, registration_deadline, status, approval_status,
  category, mode, location, budget_request, contact_person, contact_email
)
select
  'Battle of the Bands',
  'Epic band competition. 5 rounds of music madness. Best band wins scholarship.',
  id,
  (select id from public.profiles where role = 'admin' limit 1),
  timezone('utc'::text, now()) + interval '40 days',
  'Open Air Amphitheater',
  150,
  timezone('utc'::text, now()) + interval '32 days',
  'draft',
  'pending',
  'cultural',
  'offline',
  'Open Air Amphitheater',
  4000,
  'Arjun Singh',
  'arjun@music-club.edu'
from public.clubs where name = 'Music Club' limit 1;

-- Cricket Club Events
insert into public.events (
  title, description, club_id, created_by, date, venue,
  max_participants, registration_deadline, status, approval_status,
  category, mode, location, budget_request, contact_person, contact_email
)
select
  'Inter-College Cricket Tournament',
  'T20 format cricket tournament. 16 teams. First prize: $2000.',
  id,
  (select id from public.profiles where role = 'admin' limit 1),
  timezone('utc'::text, now()) + interval '45 days',
  'Cricket Ground',
  300,
  timezone('utc'::text, now()) + interval '38 days',
  'draft',
  'pending',
  'sports',
  'offline',
  'Cricket Ground',
  5000,
  'Virat Sharma',
  'virat@cricket-club.edu'
from public.clubs where name = 'Cricket Club' limit 1;

-- Entrepreneurship Club Events
insert into public.events (
  title, description, club_id, created_by, date, venue,
  max_participants, registration_deadline, status, approval_status,
  category, mode, location, budget_request, contact_person, contact_email
)
select
  'Startup Pitch Competition',
  'Pitch your startup idea to investors. Winner gets mentorship and funding.',
  id,
  (select id from public.profiles where role = 'admin' limit 1),
  timezone('utc'::text, now()) + interval '20 days',
  'Conference Room',
  60,
  timezone('utc'::text, now()) + interval '15 days',
  'draft',
  'pending',
  'competition',
  'offline',
  'Conference Room',
  1500,
  'Ravi Kumar',
  'ravi@entrepreneurship-club.edu'
from public.clubs where name = 'Entrepreneurship Club' limit 1;

-- ============================================================
-- 5. SEED MEMBERSHIP DATA (Club Approvals)
-- ============================================================

-- Note: After users are created, seed memberships in bulk
-- insert into public.club_memberships (club_id, user_id, status, joined_at)
-- select id, 'user-uuid', 'approved', timezone('utc'::text, now())
-- from public.clubs where name in ('Coding Club', 'Music Club', etc.);

-- ============================================================
-- 6. NOTIFICATION TEMPLATES FOR EVENTS
-- ============================================================

-- These will be triggered by functions/triggers when events are created/approved

-- ============================================================
-- 7. DATA VERIFICATION QUERIES
-- ============================================================

-- Count clubs by category
-- select category, count(*) as total from public.clubs group by category;

-- Count active clubs
-- select count(*) as active_clubs from public.clubs where status = 'active';

-- List all events
-- select title, date, status, approval_status from public.events order by date;

-- ============================================================
-- END OF SEED DATA
-- ============================================================
