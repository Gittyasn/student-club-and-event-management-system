-- Supabase Alignment Patch (Fixes Flow 5 & 6)
-- Adds missing columns to events and creates the attendance_records/logs infrastructure

-- 1. Patch EVENTS table
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS attendance_locked BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS attendance_locked_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS qr_token TEXT,
ADD COLUMN IF NOT EXISTS qr_generated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS certificate_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS result_required BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS results_published BOOLEAN DEFAULT false;

-- 2. Create ATTENDANCE_RECORDS table
CREATE TABLE IF NOT EXISTS public.attendance_records (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    registration_id UUID REFERENCES public.registrations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT CHECK (status IN ('present', 'absent', 'late', 'excused')) DEFAULT 'present',
    is_late BOOLEAN DEFAULT false,
    late_minutes INT DEFAULT 0,
    method TEXT DEFAULT 'manual',
    excused_reason TEXT,
    marked_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    marked_by UUID REFERENCES public.profiles(id),
    modified_at TIMESTAMP WITH TIME ZONE,
    modified_by UUID REFERENCES public.profiles(id),
    UNIQUE(event_id, user_id)
);

-- 3. Create ATTENDANCE_LOGS table
CREATE TABLE IF NOT EXISTS public.attendance_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    marked_by UUID REFERENCES public.profiles(id),
    previous_status TEXT,
    new_status TEXT,
    method TEXT,
    action_note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. Enable RLS and add basic policies
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Attendance viewable by own user" ON public.attendance_records FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Attendance manageable by coords/admins" ON public.attendance_records FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('coordinator', 'admin'))
);

CREATE POLICY "Logs viewable by admins/coords" ON public.attendance_logs FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('coordinator', 'admin'))
);

-- 5. Patch CERTIFICATES table for extended metadata
ALTER TABLE public.certificates
ADD COLUMN IF NOT EXISTS cert_type TEXT CHECK (cert_type IN ('participation', 'winner', 'merit')) DEFAULT 'participation',
ADD COLUMN IF NOT EXISTS status TEXT CHECK (status IN ('valid', 'revoked')) DEFAULT 'valid',
ADD COLUMN IF NOT EXISTS rank INT,
ADD COLUMN IF NOT EXISTS score NUMERIC,
ADD COLUMN IF NOT EXISTS grade TEXT,
ADD COLUMN IF NOT EXISTS prize_title TEXT,
ADD COLUMN IF NOT EXISTS certificate_number TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS generated_by UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS revoked_by UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS revocation_reason TEXT;

-- 6. Create CERTIFICATE_LOGS table
CREATE TABLE IF NOT EXISTS public.certificate_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    certificate_id UUID REFERENCES public.certificates(id) ON DELETE CASCADE,
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES public.profiles(id),
    action TEXT, -- generated, revoked, reinstated, downloaded
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 7. Add generated_at to certificates if missing
ALTER TABLE public.certificates ADD COLUMN IF NOT EXISTS generated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());
