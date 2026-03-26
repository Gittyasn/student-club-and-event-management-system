-- 🚀 SUPABASE PERFORMANCE & ACCURACY OPTIMIZATION SCRIPT
-- Copy and paste this into your Supabase SQL Editor and run it.

-- 1. 📂 PERFORMANCE INDEXES
-- These ensure that cross-table joins (Registrations -> Profiles, etc.) are lightning fast.
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_department ON public.profiles(department);
CREATE INDEX IF NOT EXISTS idx_events_start_time ON public.events(start_time);
CREATE INDEX IF NOT EXISTS idx_events_club_id ON public.events(club_id);
CREATE INDEX IF NOT EXISTS idx_registrations_user_id ON public.registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_registrations_event_id ON public.registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_registrations_registered_at ON public.registrations(registered_at);
CREATE INDEX IF NOT EXISTS idx_attendance_records_event_id ON public.attendance_records(event_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_status ON public.attendance_records(status);
CREATE INDEX IF NOT EXISTS idx_club_memberships_user_id ON public.club_memberships(user_id);

-- 2. 📊 ANALYTICS VIEWS (Server-Side Aggregations)
-- These compute graph data on the database server instead of downloading all rows to the browser.

-- View for Monthly Trends (Events, Registrations, Memberships)
CREATE OR REPLACE VIEW public.view_monthly_trends AS
WITH RECURSIVE months AS (
    SELECT date_trunc('month', now() - interval '11 months') as mo
    UNION ALL
    SELECT mo + interval '1 month' FROM months WHERE mo < date_trunc('month', now())
),
ev_counts AS (
    SELECT date_trunc('month', start_time) as mo, count(*) as count 
    FROM public.events GROUP BY 1
),
reg_counts AS (
    SELECT date_trunc('month', registered_at) as mo, count(*) as count 
    FROM public.registrations GROUP BY 1
),
mem_counts AS (
    SELECT date_trunc('month', joined_at) as mo, count(*) as count 
    FROM public.club_memberships GROUP BY 1
)
SELECT 
    to_char(months.mo, 'Mon YY') as name,
    COALESCE(ev_counts.count, 0) as "Events",
    COALESCE(reg_counts.count, 0) as "Registrations",
    COALESCE(mem_counts.count, 0) as "Members"
FROM months
LEFT JOIN ev_counts ON months.mo = ev_counts.mo
LEFT JOIN reg_counts ON months.mo = reg_counts.mo
LEFT JOIN mem_counts ON months.mo = mem_counts.mo
ORDER BY months.mo;

-- View for Department Analytics
CREATE OR REPLACE VIEW public.view_department_ranking AS
SELECT 
    p.department as name,
    count(*) as count
FROM public.registrations r
JOIN public.profiles p ON r.user_id = p.id
WHERE p.department IS NOT NULL
GROUP BY p.department
ORDER BY count DESC;

-- View for Club Performance
CREATE OR REPLACE VIEW public.view_club_performance AS
SELECT 
    c.name,
    count(DISTINCT e.id) as "Events",
    count(DISTINCT r.id) as "Registrations",
    ROUND(
        CASE WHEN count(DISTINCT ar.id) > 0 
        THEN (count(DISTINCT ar.id) FILTER (WHERE ar.status IN ('present', 'late'))::float / count(DISTINCT ar.id)::float) * 100 
        ELSE 0 END
    ) as "AttendanceRate"
FROM public.clubs c
LEFT JOIN public.events e ON c.id = e.club_id
LEFT JOIN public.registrations r ON e.id = r.event_id
LEFT JOIN public.attendance_records ar ON e.id = ar.event_id
GROUP BY c.id, c.name
ORDER BY "Registrations" DESC;

-- 3. 🛡️ RLS FOR VIEWS
-- Ensure that everyone can view these aggregated analytics views (or restrict to admins if needed).
ALTER VIEW public.view_monthly_trends SET (security_invoker = on);
ALTER VIEW public.view_department_ranking SET (security_invoker = on);
ALTER VIEW public.view_club_performance SET (security_invoker = on);

-- 4. 🚀 PERFORMANCE CHECK (Run this to verify)
-- EXPLAIN ANALYZE SELECT * FROM public.view_monthly_trends;
