-- ============================================================
-- Migration: Event Registration Module (Enterprise Blueprint)
-- File: 20260227_registration_module.sql
-- ============================================================

-- 1. Enhance registrations table columns
ALTER TABLE public.registrations
    ADD COLUMN IF NOT EXISTS cancelled_at timestamp with time zone,
    ADD COLUMN IF NOT EXISTS attended boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS attendance_marked_at timestamp with time zone,
    ADD COLUMN IF NOT EXISTS waitlist_position integer,
    ADD COLUMN IF NOT EXISTS admin_note text,
    ADD COLUMN IF NOT EXISTS force_registered_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 2. Ensure status is valid under the lifecycle
-- Drop old check first
ALTER TABLE public.registrations DROP CONSTRAINT IF EXISTS registrations_status_check;

-- Update any legacy statuses
UPDATE public.registrations
SET status = 'registered'
WHERE status NOT IN ('registered', 'waitlisted', 'cancelled', 'confirmed', 'rejected', 'attended', 'no_show');

-- Apply new constraint
ALTER TABLE public.registrations
    ADD CONSTRAINT registrations_status_check 
    CHECK (status IN ('registered', 'waitlisted', 'cancelled', 'confirmed', 'rejected', 'attended', 'no_show'));

-- 3. Add unique constraint to prevent duplicate registrations
ALTER TABLE public.registrations
    DROP CONSTRAINT IF EXISTS registrations_user_event_unique;

ALTER TABLE public.registrations
    ADD CONSTRAINT registrations_user_event_unique UNIQUE (user_id, event_id);

-- 4. Add waitlist position index
CREATE INDEX IF NOT EXISTS registrations_waitlist_idx 
    ON public.registrations (event_id, registered_at) 
    WHERE status = 'waitlisted';

-- 5. Create FUNCTION: promote_from_waitlist
-- This is called whenever a 'registered' slot is freed (cancellation)
CREATE OR REPLACE FUNCTION public.promote_from_waitlist()
RETURNS TRIGGER AS $$
DECLARE
    v_next_waitlisted_id uuid;
    v_event_max integer;
    v_current_count integer;
BEGIN
    -- Only run when a registration is cancelled
    IF OLD.status IN ('registered', 'confirmed') AND NEW.status = 'cancelled' THEN
        -- Get event capacity
        SELECT max_participants INTO v_event_max
        FROM public.events WHERE id = NEW.event_id;

        -- Count current registered (post-cancellation)
        SELECT COUNT(*) INTO v_current_count
        FROM public.registrations
        WHERE event_id = NEW.event_id AND status IN ('registered', 'confirmed');

        -- Only promote if there's a slot
        IF v_event_max IS NULL OR v_current_count < v_event_max THEN
            -- Get the earliest waitlisted person
            SELECT id INTO v_next_waitlisted_id
            FROM public.registrations
            WHERE event_id = NEW.event_id AND status = 'waitlisted'
            ORDER BY registered_at ASC
            LIMIT 1;

            IF v_next_waitlisted_id IS NOT NULL THEN
                UPDATE public.registrations
                SET status = 'registered',
                    waitlist_position = NULL
                WHERE id = v_next_waitlisted_id;

                -- Insert a notification for the promoted student
                INSERT INTO public.notifications (user_id, title, message, type)
                SELECT user_id,
                    'Registration Confirmed',
                    'Great news! A slot opened up and you have been moved from the waitlist to Registered.',
                    'success'
                FROM public.registrations
                WHERE id = v_next_waitlisted_id;
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop old trigger if exists
DROP TRIGGER IF EXISTS on_registration_cancelled ON public.registrations;

-- Create trigger on cancellation
CREATE TRIGGER on_registration_cancelled
    AFTER UPDATE ON public.registrations
    FOR EACH ROW
    EXECUTE FUNCTION public.promote_from_waitlist();

-- 6. Create FUNCTION: mark_no_shows
-- Updates registered students to 'no_show' when an event ends and attendance not marked
CREATE OR REPLACE FUNCTION public.mark_no_shows(p_event_id uuid)
RETURNS void AS $$
BEGIN
    UPDATE public.registrations
    SET status = 'no_show'
    WHERE event_id = p_event_id 
      AND status = 'registered'
      AND (attended IS NULL OR attended = false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. RLS Policies for registrations table
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;

-- Drop all old conflicting policies
DROP POLICY IF EXISTS "Students can view own registrations" ON public.registrations;
DROP POLICY IF EXISTS "Students can insert own registrations" ON public.registrations;
DROP POLICY IF EXISTS "Students can cancel own registrations" ON public.registrations;
DROP POLICY IF EXISTS "Coordinators can view event registrations" ON public.registrations;
DROP POLICY IF EXISTS "Admins have full access to registrations" ON public.registrations;
DROP POLICY IF EXISTS "Users can view own registrations." ON public.registrations;
DROP POLICY IF EXISTS "Users can insert own registrations." ON public.registrations;
DROP POLICY IF EXISTS "Users can update own registrations." ON public.registrations;

-- Student: View own
CREATE POLICY "Students can view own registrations" ON public.registrations
    FOR SELECT USING (user_id = auth.uid());

-- Student: Register for self
CREATE POLICY "Students can insert own registrations" ON public.registrations
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Student: Cancel own (only status = registered/waitlisted -> cancelled)
CREATE POLICY "Students can cancel own registrations" ON public.registrations
    FOR UPDATE USING (
        user_id = auth.uid()
        AND status IN ('registered', 'waitlisted')
    ) WITH CHECK (
        status = 'cancelled'
        AND user_id = auth.uid()
    );

-- Coordinator: View registrations for their club's events
CREATE POLICY "Coordinators can view event registrations" ON public.registrations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.events e
            JOIN public.profiles p ON p.club_id = e.club_id
            WHERE e.id = registrations.event_id
              AND p.id = auth.uid()
              AND p.role = 'coordinator'
        )
    );

-- Coordinator: Update attendance fields for their events
DROP POLICY IF EXISTS "Coordinators can mark attendance" ON public.registrations;
CREATE POLICY "Coordinators can mark attendance" ON public.registrations
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.events e
            JOIN public.profiles p ON p.club_id = e.club_id
            WHERE e.id = registrations.event_id
              AND p.id = auth.uid()
              AND p.role = 'coordinator'
        )
    );

-- Admin: Full access
CREATE POLICY "Admins have full access to registrations" ON public.registrations
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- 8. System: Allow automatic promotions (from trigger function using SECURITY DEFINER)
-- SECURITY DEFINER functions run as the definer, bypassing RLS – no extra policy needed.

-- Done.
