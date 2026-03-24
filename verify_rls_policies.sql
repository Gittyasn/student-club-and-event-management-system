-- Comprehensive RLS Policy Verification Script
-- Validates all security policies are properly configured

-- 1. Check Events Table Policies
SELECT 'Events Table Policies' as check_category;
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'events'
ORDER BY tablename, policyname;

-- 2. Check Registrations Table Policies
SELECT 'Registrations Table Policies' as check_category;
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'registrations'
ORDER BY tablename, policyname;

-- 3. Check Club Memberships Policies
SELECT 'Club Memberships Table Policies' as check_category;
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'club_memberships'
ORDER BY tablename, policyname;

-- 4. Check Results Table Policies
SELECT 'Results Table Policies' as check_category;
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'results'
ORDER BY tablename, policyname;

-- 5. Verify Key Columns Exist
SELECT 'Schema Validation' as check_category;

-- Check events table columns
SELECT 'events' as table_name,
       CASE 
           WHEN EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='approval_status') THEN 'approval_status: ✓'
           ELSE 'approval_status: ✗' 
       END as status
UNION ALL
SELECT 'events',
       CASE 
           WHEN EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='attendance_locked') THEN 'attendance_locked: ✓'
           ELSE 'attendance_locked: ✗' 
       END
UNION ALL
SELECT 'events',
       CASE 
           WHEN EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='results_locked') THEN 'results_locked: ✓'
           ELSE 'results_locked: ✗' 
       END
UNION ALL
SELECT 'registrations',
       CASE 
           WHEN EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='registrations' AND column_name='is_waitlisted') THEN 'is_waitlisted: ✓'
           ELSE 'is_waitlisted: ✗' 
       END
UNION ALL
SELECT 'club_memberships',
       CASE 
           WHEN EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='club_memberships' AND column_name='is_sub_coordinator') THEN 'is_sub_coordinator: ✓'
           ELSE 'is_sub_coordinator: ✗' 
       END
UNION ALL
SELECT 'feedback',
       CASE 
           WHEN EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='feedback' AND column_name='is_reviewed') THEN 'is_reviewed: ✓'
           ELSE 'is_reviewed: ✗' 
       END;

-- 6. Verify Tables Exist
SELECT 'Table Existence Check' as check_category;
SELECT table_name, 'EXISTS' as status
FROM information_schema.tables
WHERE table_schema = 'public' 
AND table_name IN ('events', 'registrations', 'club_memberships', 'results', 'certificates', 'attendance_tokens', 'audit_logs', 'feedback', 'profiles', 'clubs')
ORDER BY table_name;

-- 7. Check Functions/Edge Functions Available
SELECT 'Function Existence Check' as check_category;
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name LIKE '%attendance%'
ORDER BY routine_name;

-- 8. Count Key Records
SELECT 'Data Integrity Check' as check_category;
SELECT (SELECT COUNT(*) FROM events WHERE approval_status = 'approved') as approved_events,
       (SELECT COUNT(*) FROM registrations) as total_registrations,
       (SELECT COUNT(*) FROM club_memberships WHERE status = 'approved') as approved_members,
       (SELECT COUNT(*) FROM certificates) as issued_certificates,
       (SELECT COUNT(*) FROM audit_logs) as audit_log_entries;
