-- Hackathon Engine Support Tables

DO $$ BEGIN
    CREATE TYPE hackathon_team_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS hackathon_teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    leader_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    college_dept TEXT,
    contact_email TEXT,
    status hackathon_team_status DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(event_id, leader_id)
);

CREATE TABLE IF NOT EXISTS hackathon_team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES hackathon_teams(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    role TEXT DEFAULT 'Member',
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(team_id, user_id)
);

CREATE TABLE IF NOT EXISTS hackathon_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES hackathon_teams(id) ON DELETE CASCADE NOT NULL,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    repo_url TEXT,
    demo_url TEXT,
    presentation_url TEXT,
    is_final BOOLEAN DEFAULT FALSE,
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(team_id, event_id)
);

CREATE TABLE IF NOT EXISTS hackathon_evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID REFERENCES hackathon_submissions(id) ON DELETE CASCADE NOT NULL,
    judge_id UUID REFERENCES users(id) ON DELETE SET NULL,
    total_score NUMERIC(5,2) DEFAULT 0,
    criteria_scores JSONB DEFAULT '{}'::jsonb,
    feedback TEXT,
    evaluated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(submission_id, judge_id)
);

-- Enable RLS
ALTER TABLE hackathon_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE hackathon_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE hackathon_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE hackathon_evaluations ENABLE ROW LEVEL SECURITY;

-- 1. Teams Policies
CREATE POLICY "Public can view approved teams" ON hackathon_teams FOR SELECT USING (status = 'approved' OR leader_id = auth.uid());
CREATE POLICY "Leader can update team" ON hackathon_teams FOR UPDATE USING (leader_id = auth.uid());
CREATE POLICY "Users can create teams" ON hackathon_teams FOR INSERT WITH CHECK (leader_id = auth.uid());
CREATE POLICY "Admin can manage all teams" ON hackathon_teams FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'coordinator')));

-- 2. Team Members Policies
CREATE POLICY "Public can view team members" ON hackathon_team_members FOR SELECT USING (true);
CREATE POLICY "Leader can add members" ON hackathon_team_members FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM hackathon_teams WHERE id = hackathon_team_members.team_id AND leader_id = auth.uid()));
CREATE POLICY "Admin can manage team members" ON hackathon_team_members FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'coordinator')));

-- 3. Submissions Policies
CREATE POLICY "Public can view final submissions" ON hackathon_submissions FOR SELECT USING (is_final = true);
CREATE POLICY "Team members can view own submission" ON hackathon_submissions FOR SELECT USING (EXISTS (SELECT 1 FROM hackathon_team_members WHERE team_id = hackathon_submissions.team_id AND user_id = auth.uid()) OR EXISTS (SELECT 1 FROM hackathon_teams WHERE id = hackathon_submissions.team_id AND leader_id = auth.uid()));
CREATE POLICY "Team leader can insert/update submission" ON hackathon_submissions FOR ALL USING (EXISTS (SELECT 1 FROM hackathon_teams WHERE id = hackathon_submissions.team_id AND leader_id = auth.uid()));
CREATE POLICY "Admin/Judge can view all submissions" ON hackathon_submissions FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'coordinator')));

-- 4. Evaluations Policies
CREATE POLICY "Public can view evaluations of final submissions" ON hackathon_evaluations FOR SELECT USING (EXISTS (SELECT 1 FROM hackathon_submissions WHERE id = hackathon_evaluations.submission_id AND is_final = true));
CREATE POLICY "Admin/Judge can manage evaluations" ON hackathon_evaluations FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'coordinator')));
CREATE POLICY "Judges can insert evaluations" ON hackathon_evaluations FOR INSERT WITH CHECK (judge_id = auth.uid());
CREATE POLICY "Judges can update own evaluations" ON hackathon_evaluations FOR UPDATE USING (judge_id = auth.uid());
