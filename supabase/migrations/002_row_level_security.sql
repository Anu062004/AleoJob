-- Row Level Security Policies
-- Enable RLS and create policies for privacy

-- Enable Row Level Security on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE reputation_events ENABLE ROW LEVEL SECURITY;

-- ============================================
-- USERS POLICIES
-- ============================================

-- Users can read their own data
CREATE POLICY "Users read own data"
ON users
FOR SELECT
USING (
  aleo_address = current_setting('app.aleo_address', TRUE)
);

-- Users can update their own data
CREATE POLICY "Users update own data"
ON users
FOR UPDATE
USING (
  aleo_address = current_setting('app.aleo_address', TRUE)
);

-- Anyone can create a user (during registration)
CREATE POLICY "Anyone can create user"
ON users
FOR INSERT
WITH CHECK (true);

-- ============================================
-- JOBS POLICIES
-- ============================================

-- Anyone can read active jobs (public listings)
CREATE POLICY "Public job listings"
ON jobs
FOR SELECT
USING (is_active = TRUE);

-- Job givers can read their own jobs (including inactive)
CREATE POLICY "Giver reads own jobs"
ON jobs
FOR SELECT
USING (
  giver_id IN (
    SELECT id FROM users
    WHERE aleo_address = current_setting('app.aleo_address', TRUE)
    AND role = 'giver'
  )
);

-- Only givers can create jobs
CREATE POLICY "Job giver creates job"
ON jobs
FOR INSERT
WITH CHECK (
  giver_id IN (
    SELECT id FROM users
    WHERE aleo_address = current_setting('app.aleo_address', TRUE)
    AND role = 'giver'
  )
);

-- Only job giver can update their own jobs
CREATE POLICY "Giver updates own jobs"
ON jobs
FOR UPDATE
USING (
  giver_id IN (
    SELECT id FROM users
    WHERE aleo_address = current_setting('app.aleo_address', TRUE)
    AND role = 'giver'
  )
);

-- ============================================
-- APPLICATIONS POLICIES
-- ============================================

-- Seekers can apply to jobs
CREATE POLICY "Seeker applies to job"
ON applications
FOR INSERT
WITH CHECK (
  seeker_id IN (
    SELECT id FROM users
    WHERE aleo_address = current_setting('app.aleo_address', TRUE)
    AND role = 'seeker'
  )
);

-- Seekers can read their own applications
CREATE POLICY "Seeker reads own applications"
ON applications
FOR SELECT
USING (
  seeker_id IN (
    SELECT id FROM users
    WHERE aleo_address = current_setting('app.aleo_address', TRUE)
    AND role = 'seeker'
  )
);

-- Givers can read applications for their own jobs
CREATE POLICY "Giver views applications"
ON applications
FOR SELECT
USING (
  job_id IN (
    SELECT id FROM jobs
    WHERE giver_id IN (
      SELECT id FROM users
      WHERE aleo_address = current_setting('app.aleo_address', TRUE)
      AND role = 'giver'
    )
  )
);

-- Givers can update applications for their own jobs (accept/reject)
CREATE POLICY "Giver updates applications"
ON applications
FOR UPDATE
USING (
  job_id IN (
    SELECT id FROM jobs
    WHERE giver_id IN (
      SELECT id FROM users
      WHERE aleo_address = current_setting('app.aleo_address', TRUE)
      AND role = 'giver'
    )
  )
);

-- ============================================
-- REPUTATION EVENTS POLICIES
-- ============================================

-- Users can read their own reputation events
CREATE POLICY "Users read own reputation"
ON reputation_events
FOR SELECT
USING (
  user_id IN (
    SELECT id FROM users
    WHERE aleo_address = current_setting('app.aleo_address', TRUE)
  )
);

-- System can create reputation events (via service role)
-- Note: This would typically be done via service role, not RLS
CREATE POLICY "System creates reputation events"
ON reputation_events
FOR INSERT
WITH CHECK (true);




