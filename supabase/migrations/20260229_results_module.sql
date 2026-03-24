-- ============================================================
-- Migration: Results & Ranking Module (Enterprise Blueprint)
-- File: 20260229_results_module.sql
-- ============================================================

-- 1. Enhance the results table
ALTER TABLE public.results
    ADD COLUMN IF NOT EXISTS result_type text DEFAULT 'rank'
        CHECK (result_type IN ('rank', 'score', 'participation')),
    ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft'
        CHECK (status IN ('draft', 'published', 'locked')),
    ADD COLUMN IF NOT EXISTS score numeric(8,2),
    ADD COLUMN IF NOT EXISTS max_score numeric(8,2),
    ADD COLUMN IF NOT EXISTS grade text,
    ADD COLUMN IF NOT EXISTS prize_title text,
    ADD COLUMN IF NOT EXISTS prize_description text,
    ADD COLUMN IF NOT EXISTS cash_prize numeric(10,2),
    ADD COLUMN IF NOT EXISTS sponsor_info text,
    ADD COLUMN IF NOT EXISTS remarks text,
    ADD COLUMN IF NOT EXISTS is_winner boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS published_at timestamp with time zone,
    ADD COLUMN IF NOT EXISTS locked_at timestamp with time zone,
    ADD COLUMN IF NOT EXISTS override_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS override_reason text;

-- Rename 'position' to 'rank' (add rank column if position doesn't exist)
ALTER TABLE public.results ADD COLUMN IF NOT EXISTS rank integer;

-- Unique constraint: one result per student per event
ALTER TABLE public.results DROP CONSTRAINT IF EXISTS results_event_user_unique;
ALTER TABLE public.results ADD CONSTRAINT results_event_user_unique UNIQUE (event_id, user_id);

-- Add locks to events table
ALTER TABLE public.events
    ADD COLUMN IF NOT EXISTS results_locked boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS results_published boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS result_type text DEFAULT 'rank'
        CHECK (result_type IN ('rank', 'score', 'participation'));

-- 2. Create judges table
CREATE TABLE IF NOT EXISTS public.judges (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    event_id uuid REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    weight numeric(5,2) DEFAULT 1.0 CHECK (weight > 0 AND weight <= 10),
    role_label text DEFAULT 'Judge',
    created_at timestamp with time zone DEFAULT NOW(),
    UNIQUE (event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_judges_event ON public.judges(event_id);
ALTER TABLE public.judges ENABLE ROW LEVEL SECURITY;

-- Judges RLS
DROP POLICY IF EXISTS "Coordinators manage judges for their events" ON public.judges;
CREATE POLICY "Coordinators manage judges for their events" ON public.judges
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.events e
            JOIN public.profiles p ON p.club_id = e.club_id
            WHERE e.id = judges.event_id AND p.id = auth.uid() AND p.role = 'coordinator'
        )
    );

DROP POLICY IF EXISTS "Admins have full access to judges" ON public.judges;
CREATE POLICY "Admins have full access to judges" ON public.judges
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

DROP POLICY IF EXISTS "Anyone can view judges" ON public.judges;
CREATE POLICY "Anyone can view judges" ON public.judges
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- 3. Create result_logs audit table
CREATE TABLE IF NOT EXISTS public.result_logs (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
    result_id uuid REFERENCES public.results(id) ON DELETE SET NULL,
    actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    action text NOT NULL, -- 'draft_saved', 'published', 'locked', 'unlocked', 'admin_override', 'recalculated'
    previous_data jsonb,
    new_data jsonb,
    note text,
    created_at timestamp with time zone DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_result_logs_event ON public.result_logs(event_id);
ALTER TABLE public.result_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can see all result logs" ON public.result_logs;
CREATE POLICY "Admins can see all result logs" ON public.result_logs
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

DROP POLICY IF EXISTS "Coordinators can see result logs for their events" ON public.result_logs;
CREATE POLICY "Coordinators can see result logs for their events" ON public.result_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.events e
            JOIN public.profiles p ON p.club_id = e.club_id
            WHERE e.id = result_logs.event_id AND p.id = auth.uid() AND p.role = 'coordinator'
        )
    );

DROP POLICY IF EXISTS "Roles can insert result logs" ON public.result_logs;
CREATE POLICY "Roles can insert result logs" ON public.result_logs
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','coordinator'))
    );

-- 4. FUNCTION: calculate_ranks_for_event
-- Auto-assigns ranks sorted by score DESC, with tie-skipping logic
CREATE OR REPLACE FUNCTION public.calculate_ranks_for_event(p_event_id uuid)
RETURNS void AS $$
DECLARE
    v_rec RECORD;
    v_rank integer := 1;
    v_prev_score numeric := NULL;
    v_actual_rank integer := 1;
    v_row_num integer := 0;
BEGIN
    FOR v_rec IN
        SELECT id, score
        FROM public.results
        WHERE event_id = p_event_id
          AND result_type = 'score'
        ORDER BY score DESC NULLS LAST
    LOOP
        v_row_num := v_row_num + 1;

        IF v_prev_score IS NULL OR v_rec.score != v_prev_score THEN
            v_actual_rank := v_row_num; -- Tie-skipping: rank = position in ordered list
        END IF;

        UPDATE public.results
        SET rank = v_actual_rank
        WHERE id = v_rec.id;

        v_prev_score := v_rec.score;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. FUNCTION: publish_event_results
-- Transitions all draft results for an event to 'published' + calculates ranks
CREATE OR REPLACE FUNCTION public.publish_event_results(p_event_id uuid, p_actor_id uuid)
RETURNS void AS $$
BEGIN
    -- Calculate ranks first
    PERFORM public.calculate_ranks_for_event(p_event_id);

    -- Mark all results as published
    UPDATE public.results
    SET status = 'published', published_at = NOW()
    WHERE event_id = p_event_id AND status = 'draft';

    -- Mark event as results_published
    UPDATE public.events
    SET results_published = true
    WHERE id = p_event_id;

    -- Audit log
    INSERT INTO public.result_logs (event_id, actor_id, action, note)
    VALUES (p_event_id, p_actor_id, 'published', 'Results published and ranks calculated.');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. FUNCTION: lock_event_results
CREATE OR REPLACE FUNCTION public.lock_event_results(p_event_id uuid, p_actor_id uuid)
RETURNS void AS $$
BEGIN
    UPDATE public.results
    SET status = 'locked', locked_at = NOW()
    WHERE event_id = p_event_id AND status = 'published';

    UPDATE public.events
    SET results_locked = true
    WHERE id = p_event_id;

    INSERT INTO public.result_logs (event_id, actor_id, action, note)
    VALUES (p_event_id, p_actor_id, 'locked', 'Results locked. Certificates finalized.');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. RLS for results table
ALTER TABLE public.results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can view published results for their own entries" ON public.results;
CREATE POLICY "Students can view published results for their own entries" ON public.results
    FOR SELECT USING (
        user_id = auth.uid() AND status IN ('published', 'locked')
    );

DROP POLICY IF EXISTS "Students can view all published results of an event" ON public.results;
CREATE POLICY "Students can view all published results of an event" ON public.results
    FOR SELECT USING (
        status IN ('published', 'locked')
        AND EXISTS (
            SELECT 1 FROM public.registrations r
            WHERE r.event_id = results.event_id AND r.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Coordinators can manage results for their events" ON public.results;
CREATE POLICY "Coordinators can manage results for their events" ON public.results
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.events e
            JOIN public.profiles p ON p.club_id = e.club_id
            WHERE e.id = results.event_id AND p.id = auth.uid() AND p.role = 'coordinator'
            AND (e.results_locked IS NULL OR e.results_locked = false)
        )
    );

DROP POLICY IF EXISTS "Admins have full access to results" ON public.results;
CREATE POLICY "Admins have full access to results" ON public.results
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Done.
