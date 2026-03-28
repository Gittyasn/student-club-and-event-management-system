-- Fix common Supabase Performance Advisor warnings:
-- foreign_key_without_index
--
-- Safe to run multiple times.
-- These indexes improve joins, deletes, updates, and RLS checks on FK columns.

CREATE INDEX IF NOT EXISTS idx_attendance_user_id
    ON public.attendance(user_id);

CREATE INDEX IF NOT EXISTS idx_attendance_logs_marked_by
    ON public.attendance_logs(marked_by);

CREATE INDEX IF NOT EXISTS idx_attendance_records_marked_by
    ON public.attendance_records(marked_by);

CREATE INDEX IF NOT EXISTS idx_attendance_records_modified_by
    ON public.attendance_records(modified_by);

CREATE INDEX IF NOT EXISTS idx_budget_items_club_id
    ON public.budget_items(club_id);

CREATE INDEX IF NOT EXISTS idx_budget_items_created_by
    ON public.budget_items(created_by);

CREATE INDEX IF NOT EXISTS idx_budget_items_event_id
    ON public.budget_items(event_id);

CREATE INDEX IF NOT EXISTS idx_cert_templates_created_by
    ON public.cert_templates(created_by);

CREATE INDEX IF NOT EXISTS idx_certificate_logs_actor_id
    ON public.certificate_logs(actor_id);

CREATE INDEX IF NOT EXISTS idx_certificate_logs_certificate_id
    ON public.certificate_logs(certificate_id);

CREATE INDEX IF NOT EXISTS idx_certificates_generated_by
    ON public.certificates(generated_by);

CREATE INDEX IF NOT EXISTS idx_certificates_revoked_by
    ON public.certificates(revoked_by);

CREATE INDEX IF NOT EXISTS idx_certificates_user_id_fk
    ON public.certificates(user_id);

CREATE INDEX IF NOT EXISTS idx_chat_rooms_team_id
    ON public.chat_rooms(team_id);

CREATE INDEX IF NOT EXISTS idx_club_members_user_id
    ON public.club_members(user_id);

CREATE INDEX IF NOT EXISTS idx_club_memberships_approved_by
    ON public.club_memberships(approved_by);

CREATE INDEX IF NOT EXISTS idx_clubs_category_id
    ON public.clubs(category_id);

CREATE INDEX IF NOT EXISTS idx_event_logs_changed_by
    ON public.event_logs(changed_by);

CREATE INDEX IF NOT EXISTS idx_event_logs_event_id
    ON public.event_logs(event_id);

CREATE INDEX IF NOT EXISTS idx_event_registrations_user_id
    ON public.event_registrations(user_id);

CREATE INDEX IF NOT EXISTS idx_events_category_id
    ON public.events(category_id);

CREATE INDEX IF NOT EXISTS idx_events_created_by
    ON public.events(created_by);

CREATE INDEX IF NOT EXISTS idx_feedback_user_id
    ON public.feedback(user_id);

CREATE INDEX IF NOT EXISTS idx_judges_user_id
    ON public.judges(user_id);

CREATE INDEX IF NOT EXISTS idx_messages_chat_id_fk
    ON public.messages(chat_id);

CREATE INDEX IF NOT EXISTS idx_messages_parent_id_fk
    ON public.messages(parent_id);

CREATE INDEX IF NOT EXISTS idx_messages_sender_id
    ON public.messages(sender_id);

CREATE INDEX IF NOT EXISTS idx_profiles_club_id
    ON public.profiles(club_id);

CREATE INDEX IF NOT EXISTS idx_registrations_force_registered_by
    ON public.registrations(force_registered_by);

CREATE INDEX IF NOT EXISTS idx_result_logs_actor_id
    ON public.result_logs(actor_id);

CREATE INDEX IF NOT EXISTS idx_result_logs_result_id
    ON public.result_logs(result_id);

CREATE INDEX IF NOT EXISTS idx_results_override_by
    ON public.results(override_by);

CREATE INDEX IF NOT EXISTS idx_results_team_id
    ON public.results(team_id);

CREATE INDEX IF NOT EXISTS idx_results_user_id
    ON public.results(user_id);

CREATE INDEX IF NOT EXISTS idx_team_members_user_id
    ON public.team_members(user_id);

CREATE INDEX IF NOT EXISTS idx_teams_leader_id
    ON public.teams(leader_id);

-- Re-run the advisor inspection after this patch.
