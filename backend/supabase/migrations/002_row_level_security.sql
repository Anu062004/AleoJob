-- Row Level Security Policies

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE reputation_events ENABLE ROW LEVEL SECURITY;

-- USERS
CREATE POLICY "Users read own data"
ON users
FOR SELECT
USING (
  aleo_address = current_setting('app.aleo_address', TRUE)
);

CREATE POLICY "Users update own data"
ON users
FOR UPDATE
USING (
  aleo_address = current_setting('app.aleo_address', TRUE)
);

CREATE POLICY "Anyone can create user"
ON users
FOR INSERT
WITH CHECK (true);

-- JOBS
CREATE POLICY "Public job listings"
ON jobs
FOR SELECT
USING (is_active = TRUE);

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

-- APPLICATIONS
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

-- REPUTATION
CREATE POLICY "Users read own reputation"
ON reputation_events
FOR SELECT
USING (
  user_id IN (
    SELECT id FROM users
    WHERE aleo_address = current_setting('app.aleo_address', TRUE)
  )
);

CREATE POLICY "System creates reputation events"
ON reputation_events
FOR INSERT
WITH CHECK (true);


