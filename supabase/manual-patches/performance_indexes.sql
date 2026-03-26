-- ========================================================
-- HIGH PERFORMANCE B-TREE INDEXES FOR ENTERPRISE SCALING
-- ========================================================
-- Description: These indexes transform sequential scans 
-- into indexed lookups on heavily filtered foreign keys 
-- and status columns, drastically improving query speed.

-- 1. Events Table Optimizations
-- Heavily filtered by club_id (Coordinator Dashboards)
CREATE INDEX IF NOT EXISTS idx_events_club_id ON public.events(club_id);
-- Filtered globally by status & approval (Student Browsing, Admin Queue)
CREATE INDEX IF NOT EXISTS idx_events_status_approval ON public.events(status, approval_status);

-- 2. Registrations Table Optimizations
-- Heavily executed COUNT() grouping for capacities and results
CREATE INDEX IF NOT EXISTS idx_registrations_event_id ON public.registrations(event_id);
-- Dashboard queries for "My Registrations"
CREATE INDEX IF NOT EXISTS idx_registrations_user_id ON public.registrations(user_id);

-- 3. Club Memberships Optimizations
-- Filtering for Coordinator's "Manage Members"
CREATE INDEX IF NOT EXISTS idx_club_memberships_club_id ON public.club_memberships(club_id);
-- Filtering for Student's "My Clubs"
CREATE INDEX IF NOT EXISTS idx_club_memberships_user_id ON public.club_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_club_memberships_status ON public.club_memberships(status);

-- 4. Fast Lookups for Results and Feedback Verification
CREATE INDEX IF NOT EXISTS idx_results_event_id ON public.results(event_id);
CREATE INDEX IF NOT EXISTS idx_feedback_event_id ON public.feedback(event_id);

-- 5. Chat Engine Realtime Filtering
CREATE INDEX IF NOT EXISTS idx_chat_rooms_event_id ON public.chat_rooms(event_id);
-- Note: idx_messages_room_id and idx_messages_sender_id are already in schema.sql

ANALYZE; -- Updates query planner statistics
