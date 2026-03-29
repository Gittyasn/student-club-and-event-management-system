-- ============================================================
-- Migration: Attendance Management Module (Enterprise Blueprint)
-- File: 20260228_attendance_module.sql
-- ============================================================

-- 1. Enhance attendance_records table
ALTER TABLE public.attendance_records
    ADD COLUMN IF NOT EXISTS is_late boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS late_minutes integer DEFAULT 0,
    ADD COLUMN IF NOT EXISTS excused_reason text,
    ADD COLUMN IF NOT EXISTS modified_at timestamp with time zone,
    ADD COLUMN IF NOT EXISTS modified_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 2. Update status constraint to include 'excused'
ALTER TABLE public.attendance_records DROP CONSTRAINT IF EXISTS attendance_records_status_check;
ALTER TABLE public.attendance_records
    ADD CONSTRAINT attendance_records_status_check
    CHECK (status IN ('present', 'late', 'absent', 'excused'));

-- 3. Add unique constraint to prevent duplicate entries per student/event
ALTER TABLE public.attendance_records
    DROP CONSTRAINT IF EXISTS attendance_records_user_event_unique;
ALTER TABLE public.attendance_records
    ADD CONSTRAINT attendance_records_user_event_unique UNIQUE (event_id, user_id);

-- 4. Add attendance_locked field to events table if not present
ALTER TABLE public.events
    ADD COLUMN IF NOT EXISTS attendance_locked boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS attendance_locked_at timestamp with time zone,
    ADD COLUMN IF NOT EXISTS qr_token text,
    ADD COLUMN IF NOT EXISTS qr_generated_at timestamp with time zone;

-- 5. Create attendance_logs audit table
CREATE TABLE IF NOT EXISTS public.attendance_logs (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
    student_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    marked_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    previous_status text,
    new_status text,
    method text CHECK (method IN ('manual', 'qr', 'bulk', 'admin_override', 'auto_absent')),
    action_note text,
    created_at timestamp with time zone DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attendance_logs_event ON public.attendance_logs(event_id);
CREATE INDEX IF NOT EXISTS idx_attendance_logs_student ON public.attendance_logs(student_id);
ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;

-- Admin can see all logs
DROP POLICY IF EXISTS "Admins can view attendance logs" ON public.attendance_logs;
CREATE POLICY "Admins can view attendance logs" ON public.attendance_logs
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Coordinators see logs for their events
DROP POLICY IF EXISTS "Coordinators can view attendance logs for their events" ON public.attendance_logs;
CREATE POLICY "Coordinators can view attendance logs for their events" ON public.attendance_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.events e
            JOIN public.profiles p ON p.club_id = e.club_id
            WHERE e.id = attendance_logs.event_id
              AND p.id = auth.uid()
              AND p.role = 'coordinator'
        )
    );

-- Anyone with proper role can insert logs (SECURITY DEFINER functions handle this)
DROP POLICY IF EXISTS "Roles can insert attendance logs" ON public.attendance_logs;
CREATE POLICY "Roles can insert attendance logs" ON public.attendance_logs
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'coordinator'))
    );

-- 6. FUNCTION: auto_mark_absent
-- Called by admin/coordinator after event ends to mark absent all unrecorded registered students
CREATE OR REPLACE FUNCTION public.auto_mark_absent(p_event_id uuid)
RETURNS integer AS $$
DECLARE
    v_count integer := 0;
    v_reg RECORD;
BEGIN
    FOR v_reg IN
        SELECT r.id, r.user_id
        FROM public.registrations r
        WHERE r.event_id = p_event_id
          AND r.status IN ('registered', 'confirmed')
          AND NOT EXISTS (
              SELECT 1 FROM public.attendance_records ar
              WHERE ar.event_id = p_event_id AND ar.user_id = r.user_id
          )
    LOOP
        INSERT INTO public.attendance_records (
            event_id, registration_id, user_id, status, method, marked_at
        ) VALUES (
            p_event_id, v_reg.id, v_reg.user_id, 'absent', 'auto_absent', NOW()
        )
        ON CONFLICT (event_id, user_id) DO NOTHING;

        -- Log the auto-absent
        INSERT INTO public.attendance_logs (event_id, student_id, previous_status, new_status, method, action_note)
        VALUES (p_event_id, v_reg.user_id, 'pending', 'absent', 'auto_absent', 'Auto-marked absent after event completion.');

        v_count := v_count + 1;
    END LOOP;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. RLS Policies for attendance_records
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

-- Drop any old conflicting policies
DROP POLICY IF EXISTS "Admins can view attendance records" ON public.attendance_records;
DROP POLICY IF EXISTS "Coordinators can view attendance for their clubs' events" ON public.attendance_records;
DROP POLICY IF EXISTS "Students can view their own attendance records" ON public.attendance_records;
DROP POLICY IF EXISTS "Authenticated users can insert their own attendance records" ON public.attendance_records;
DROP POLICY IF EXISTS "Coordinators can update attendance" ON public.attendance_records;
DROP POLICY IF EXISTS "Admins can do all on attendance" ON public.attendance_records;

-- Student: view own
CREATE POLICY "Students can view own attendance" ON public.attendance_records
    FOR SELECT USING (user_id = auth.uid());

-- Student: self-QR insert (QR flow)
CREATE POLICY "Students can self-insert attendance via QR" ON public.attendance_records
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Coordinator: view for their event
CREATE POLICY "Coordinators can view attendance for their events" ON public.attendance_records
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.events e
            JOIN public.profiles p ON p.club_id = e.club_id
            WHERE e.id = attendance_records.event_id
              AND p.id = auth.uid()
              AND p.role = 'coordinator'
        )
    );

-- Coordinator: insert attendance for their event (manual/bulk marking)
CREATE POLICY "Coordinators can insert attendance for their events" ON public.attendance_records
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.events e
            JOIN public.profiles p ON p.club_id = e.club_id
            WHERE e.id = attendance_records.event_id
              AND p.id = auth.uid()
              AND p.role = 'coordinator'
        )
    );

-- Coordinator: update attendance for non-locked events
CREATE POLICY "Coordinators can update attendance for unlocked events" ON public.attendance_records
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.events e
            JOIN public.profiles p ON p.club_id = e.club_id
            WHERE e.id = attendance_records.event_id
              AND p.id = auth.uid()
              AND p.role = 'coordinator'
              AND (e.attendance_locked IS NULL OR e.attendance_locked = false)
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.events e
            JOIN public.profiles p ON p.club_id = e.club_id
            WHERE e.id = attendance_records.event_id
              AND p.id = auth.uid()
              AND p.role = 'coordinator'
              AND (e.attendance_locked IS NULL OR e.attendance_locked = false)
        )
    );

-- Admin: full control
CREATE POLICY "Admins have full access to attendance records" ON public.attendance_records
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Done.
