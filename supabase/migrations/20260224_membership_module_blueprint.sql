-- ==============================================================================
-- MODULE 7: MEMBERSHIP MANAGEMENT & GOVERNANCE
-- Description: Expands the club_memberships table with roles and lifecycles, and
-- adds configuration settings to the clubs table.
-- ==============================================================================

-- 1. Modify club_memberships table
-- Drop existing check constraint if it exists (Supabase might auto-name it based on table name)
ALTER TABLE public.club_memberships DROP CONSTRAINT IF EXISTS club_memberships_status_check;

-- Add new columns to club_memberships
ALTER TABLE public.club_memberships 
    ADD COLUMN IF NOT EXISTS role text check (role in ('member', 'core_member', 'sub_coordinator', 'volunteer')) default 'member',
    ADD COLUMN IF NOT EXISTS removed_at timestamp with time zone,
    ADD COLUMN IF NOT EXISTS removal_reason text,
    ADD COLUMN IF NOT EXISTS approved_by uuid references public.profiles(id) on delete set null,
    ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone default timezone('utc'::text, now());

-- Re-add the status check constraint with new lifecycle statuses
ALTER TABLE public.club_memberships
    ADD CONSTRAINT club_memberships_status_check 
    CHECK (status IN ('pending', 'approved', 'rejected', 'removed', 'left', 'suspended'));


-- 2. Modify clubs table (Configuration Policies)
ALTER TABLE public.clubs
    ADD COLUMN IF NOT EXISTS max_members int,
    ADD COLUMN IF NOT EXISTS department_restriction text[],
    ADD COLUMN IF NOT EXISTS year_restriction int[],
    ADD COLUMN IF NOT EXISTS auto_approve_memberships boolean default false,
    ADD COLUMN IF NOT EXISTS require_questionnaire boolean default false;


-- 3. Modify system_settings (Global Variables)
-- Create table if it doesn't already exist (from previous module, but safe to ensure)
CREATE TABLE IF NOT EXISTS public.system_settings (
    id uuid default uuid_generate_v4() primary key,
    key text unique not null,
    value jsonb not null,
    description text,
    updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Insert global membership settings
INSERT INTO public.system_settings (key, value, description)
VALUES 
    ('max_clubs_per_student', '3', 'Maximum number of clubs a single student is allowed to join.'),
    ('membership_approval_timeout_days', '14', 'Auto-reject pending requests after this many days.')
ON CONFLICT (key) DO UPDATE 
SET value = EXCLUDED.value, description = EXCLUDED.description;


-- 4. Secure RLS Policies for club_memberships
-- Drop old simple policies
DROP POLICY IF EXISTS "Students can request to join a club." ON public.club_memberships;
DROP POLICY IF EXISTS "Coordinators can update membership status for their club." ON public.club_memberships;

-- Recreate sophisticated Student policies
-- Students can insert a request ONLY IF their account isn't blocked. 
-- (Assuming application logic handles checking if they exceed max_clubs or club limits, RLS is a secondary barrier)
CREATE POLICY "Students can request to join a club." 
ON public.club_memberships 
FOR INSERT 
WITH CHECK (
    auth.uid() = user_id 
    AND status = 'pending' 
    AND exists (select 1 from public.profiles where id = auth.uid() and account_status = 'active')
);

-- Students can ONLY update their status to 'left'
CREATE POLICY "Students can leave a club."
ON public.club_memberships
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (status = 'left');

-- Coordinator Update Policy (Approve, Reject, Remove, Change Role)
CREATE POLICY "Coordinators can manage their club memberships." 
ON public.club_memberships 
FOR UPDATE 
USING (
    exists (
        select 1
        from public.profiles p
        left join public.clubs c on c.id = public.club_memberships.club_id
        where p.id = auth.uid() 
          and p.role = 'coordinator'
          and (
            p.club_id = public.club_memberships.club_id
            or c.coordinator_id = auth.uid()
            or exists (
                select 1
                from public.club_memberships cm
                where cm.club_id = public.club_memberships.club_id
                  and cm.user_id = auth.uid()
                  and cm.status = 'approved'
                  and cm.role = 'sub_coordinator'
            )
          )
    )
    OR exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Ensure Admins have full access
CREATE POLICY "Admins have full access to memberships." 
ON public.club_memberships 
FOR ALL 
USING (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- Note: We are keeping the existing "Users can view own memberships" and "Coordinators can view..." policies as they are still structurally sound.
