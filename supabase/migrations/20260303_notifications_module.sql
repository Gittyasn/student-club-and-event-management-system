-- Migration: 20260303_notifications_module.sql
-- Description: Full Enterprise Notification System with Preferences, Types, and Triggers

-- 1. Create Preferences Table
CREATE TABLE IF NOT EXISTS public.user_notification_preferences (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    email_enabled BOOLEAN DEFAULT true,
    event_reminders_enabled BOOLEAN DEFAULT true,
    chat_enabled BOOLEAN DEFAULT true,
    membership_enabled BOOLEAN DEFAULT true,
    system_enabled BOOLEAN DEFAULT true,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Note: In older migrations `notifications` might exist. We'll add columns if missing.
-- Let's drop and recreate to ensure full schema alignment if we are building fresh.
-- For safety, we conditionally add columns instead of dropping if needed, but given the prompt we need specific fields:
DROP TABLE IF EXISTS public.notifications CASCADE;

CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('event', 'membership', 'attendance', 'result', 'certificate', 'chat', 'system', 'announcement', 'alert', 'success', 'info')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    related_id UUID, -- Generic reference
    related_type TEXT, -- e.g., 'event', 'club', 'registration'
    is_read BOOLEAN DEFAULT false,
    delivered BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.notifications
DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
ADD CONSTRAINT notifications_type_check
CHECK (type IN ('event', 'membership', 'attendance', 'result', 'certificate', 'chat', 'system', 'announcement', 'alert', 'success', 'info'));

-- 2. Indexes for fast retrieval
CREATE INDEX idx_user_notification_prefs_userid ON public.user_notification_preferences(user_id);
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_unread ON public.notifications(user_id) WHERE is_read = false;

-- 3. RLS Policies
ALTER TABLE public.user_notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Preferences RLS
CREATE POLICY "Users can view their own preferences" 
    ON public.user_notification_preferences FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences" 
    ON public.user_notification_preferences FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences" 
    ON public.user_notification_preferences FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- Notifications RLS
CREATE POLICY "Users can view their own notifications" 
    ON public.notifications FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications (read status)" 
    ON public.notifications FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications"
    ON public.notifications FOR DELETE
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can insert notifications for anyone" 
    ON public.notifications FOR INSERT 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
        OR auth.uid() = user_id -- Allow system/self inserts temporarily 
    );

-- 4. Utility: Auto-create preferences for new users
CREATE OR REPLACE FUNCTION public.handle_new_user_preferences() 
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_notification_preferences (user_id)
    VALUES (new.id);
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for preferences on user creation
DROP TRIGGER IF EXISTS on_auth_user_created_preferences ON public.profiles;
CREATE TRIGGER on_auth_user_created_preferences
    AFTER INSERT ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_preferences();

-- Insert preferences for existing users
INSERT INTO public.user_notification_preferences (user_id)
SELECT id FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;

-- 5. Centralized Event Triggers

-- A. Event Approval/Rejection Trigger
CREATE OR REPLACE FUNCTION public.trigger_event_status_notification()
RETURNS TRIGGER AS $$
DECLARE
    coord_id UUID;
    event_title TEXT;
BEGIN
    -- Only trigger on status change for approval
    IF NEW.status != OLD.status AND (NEW.status = 'approved' OR NEW.status = 'rejected') THEN
        SELECT coordinator_id INTO coord_id FROM public.clubs WHERE id = NEW.club_id;
        event_title := NEW.title;
        
        -- Check if user wants system alerts (fallback to true if pref not found)
        IF COALESCE((SELECT system_enabled FROM public.user_notification_preferences WHERE user_id = coord_id), true) THEN
            INSERT INTO public.notifications (user_id, type, title, message, related_id, related_type)
            VALUES (
                coord_id, 
                CASE WHEN NEW.status = 'approved' THEN 'success' ELSE 'alert' END,
                'Event ' || INITCAP(NEW.status),
                'Your event "' || event_title || '" has been ' || NEW.status || '.',
                NEW.id, 'event'
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_event_approval_notification ON public.events;
CREATE TRIGGER trg_event_approval_notification
    AFTER UPDATE OF status ON public.events
    FOR EACH ROW EXECUTE FUNCTION public.trigger_event_status_notification();

-- B. Membership Request / Approval Trigger
CREATE OR REPLACE FUNCTION public.trigger_membership_notification()
RETURNS TRIGGER AS $$
DECLARE
    club_name TEXT;
    coord_id UUID;
BEGIN
    SELECT name, coordinator_id INTO club_name, coord_id FROM public.clubs WHERE id = NEW.club_id;

    -- If New Request -> Notify Coordinator
    IF TG_OP = 'INSERT' AND NEW.status = 'pending' THEN
        IF COALESCE((SELECT membership_enabled FROM public.user_notification_preferences WHERE user_id = coord_id), true) THEN
            INSERT INTO public.notifications (user_id, type, title, message, related_id, related_type)
            VALUES (
                coord_id, 'membership', 'New Membership Request',
                'A new student has requested to join ' || club_name || '.',
                NEW.club_id, 'club'
            );
        END IF;
    -- If Status Update -> Notify Student
    ELSIF TG_OP = 'UPDATE' AND NEW.status != OLD.status AND (NEW.status = 'approved' OR NEW.status = 'rejected') THEN
        IF COALESCE((SELECT membership_enabled FROM public.user_notification_preferences WHERE user_id = NEW.user_id), true) THEN
            INSERT INTO public.notifications (user_id, type, title, message, related_id, related_type)
            VALUES (
                NEW.user_id, 
                CASE WHEN NEW.status = 'approved' THEN 'success' ELSE 'alert' END,
                'Club Membership ' || INITCAP(NEW.status),
                'Your request to join ' || club_name || ' has been ' || NEW.status || '.',
                NEW.club_id, 'club'
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_membership_notification ON public.club_memberships;
CREATE TRIGGER trg_membership_notification
    AFTER INSERT OR UPDATE OF status ON public.club_memberships
    FOR EACH ROW EXECUTE FUNCTION public.trigger_membership_notification();

-- C. Registration Status Trigger
CREATE OR REPLACE FUNCTION public.trigger_registration_notification()
RETURNS TRIGGER AS $$
DECLARE
    event_title TEXT;
BEGIN
    -- Notify Student on Status Change (Approved from Waitlist/Pending)
    IF TG_OP = 'UPDATE' AND NEW.status != OLD.status AND NEW.status = 'registered' THEN
        SELECT title INTO event_title FROM public.events WHERE id = NEW.event_id;
        IF COALESCE((SELECT system_enabled FROM public.user_notification_preferences WHERE user_id = NEW.user_id), true) THEN
            INSERT INTO public.notifications (user_id, type, title, message, related_id, related_type)
            VALUES (
                NEW.user_id, 'success', 'Registration Confirmed',
                'You are successfully registered for ' || event_title || '.',
                NEW.event_id, 'event'
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_registration_notification ON public.registrations;
CREATE TRIGGER trg_registration_notification
    AFTER UPDATE OF status ON public.registrations
    FOR EACH ROW EXECUTE FUNCTION public.trigger_registration_notification();

-- D. Admin Broadcast Function
CREATE OR REPLACE FUNCTION public.create_broadcast_notification(
    p_title TEXT,
    p_message TEXT,
    p_target_role TEXT DEFAULT 'all', -- 'all', 'student', 'coordinator'
    p_target_club_id UUID DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    -- Check if sender is admin
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
        RAISE EXCEPTION 'Only admins can broadcast notifications.';
    END IF;

    IF p_target_club_id IS NOT NULL THEN
        -- Broadcast to specific club members
        INSERT INTO public.notifications (user_id, type, title, message, related_id, related_type)
        SELECT user_id, 'announcement', p_title, p_message, p_target_club_id, 'club'
        FROM public.club_memberships
        WHERE club_id = p_target_club_id AND status = 'approved';
    ELSE
        -- Broadcast by role
        INSERT INTO public.notifications (user_id, type, title, message)
        SELECT id, 'announcement', p_title, p_message
        FROM public.profiles
        WHERE (p_target_role = 'all' OR role = p_target_role);
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable Supabase Realtime for Notifications to trigger live frontend updates!
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
    END IF;
END $$;
