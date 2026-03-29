-- Migration: 20260304_notification_scheduler.sql
-- Description: Adds pg_cron extension and scheduled notification processing for events.

-- Enable pg_cron (Note: This requires superuser privileges and standard Supabase instances support it)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Function to check upcoming events and send reminders
CREATE OR REPLACE FUNCTION public.process_event_reminders()
RETURNS VOID AS $$
DECLARE
    upcoming_event RECORD;
BEGIN
    -- Find events starting in exactly 24 hours (with a 1-hour window to avoid duplicate drops/misses if cron runs hourly)
    FOR upcoming_event IN 
        SELECT id, title, start_time 
        FROM public.events 
        WHERE status = 'approved' 
        AND start_time >= NOW() + INTERVAL '23 hours' 
        AND start_time <= NOW() + INTERVAL '24 hours'
    LOOP
        -- Insert a notification for every registered student who has event_reminders_enabled
        INSERT INTO public.notifications (user_id, type, title, message, related_id, related_type)
        SELECT 
            r.user_id, 
            'event', 
            'Upcoming Event Reminder',
            'Reminder: "' || upcoming_event.title || '" is starting within 24 hours!',
            upcoming_event.id, 
            'event'
        FROM public.registrations r
        JOIN public.user_notification_preferences p ON r.user_id = p.user_id
        WHERE r.event_id = upcoming_event.id 
        AND r.status = 'registered' 
        AND p.event_reminders_enabled = true;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule the cron job to run hourly
-- Check if cron exist first (optional, but safe)
DO $$
BEGIN
    PERFORM cron.schedule(
        'event-reminders-hourly', -- Job Name
        '0 * * * *',              -- Every hour at minute 0
        'SELECT public.process_event_reminders();'
    );
EXCEPTION WHEN OTHERS THEN
    -- If pg_cron is not enabled or job exists
    RAISE NOTICE 'Skipping pg_cron schedule generation. Ensure pg_cron is enabled.';
END $$;
