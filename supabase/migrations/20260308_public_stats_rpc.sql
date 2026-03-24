-- Public stats RPC for landing page (20260308)

CREATE OR REPLACE FUNCTION public.get_public_stats()
RETURNS TABLE (
    active_clubs BIGINT,
    events_conducted BIGINT,
    active_students BIGINT,
    certificates_issued BIGINT,
    avg_attendance_rate NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        (SELECT COUNT(*) FROM public.clubs WHERE status = 'active' AND visibility = true),
        (SELECT COUNT(*) FROM public.events WHERE approval_status = 'approved'),
        (SELECT COUNT(*) FROM public.profiles WHERE role = 'student' AND account_status = 'active'),
        (SELECT COUNT(*) FROM public.certificates WHERE status = 'valid'),
        (
            SELECT COALESCE(
                ROUND(
                    100.0 * SUM(CASE WHEN status IN ('present', 'late') THEN 1 ELSE 0 END)
                    / NULLIF(COUNT(*), 0),
                1),
                0
            )
            FROM public.attendance_records
        );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_stats() TO anon, authenticated;
