-- Complete Database Setup for AleoJob
-- Run this entire file in Supabase SQL Editor: https://app.supabase.com/project/qzhstrsehwdxmnurjulf/sql/new
-- This combines all migrations into one file for easy execution

-- ============================================
-- 1. Enable UUID extension
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 2. Create Tables
-- ============================================

-- Users Table (Minimal & Anonymous)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  aleo_address TEXT UNIQUE NOT NULL,
  role TEXT CHECK (role IN ('giver', 'seeker')) NOT NULL,
  reputation_score INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_aleo_address ON users(aleo_address);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Jobs Table
CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  giver_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  skills TEXT[],
  budget TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  zk_membership_hash TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jobs_giver_id ON jobs(giver_id);
CREATE INDEX IF NOT EXISTS idx_jobs_is_active ON jobs(is_active);
CREATE INDEX IF NOT EXISTS idx_jobs_zk_hash ON jobs(zk_membership_hash);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at DESC);

-- Applications Table
CREATE TABLE IF NOT EXISTS applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE NOT NULL,
  seeker_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  encrypted_resume_url TEXT,
  encrypted_cover_letter TEXT,
  zk_application_hash TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (job_id, seeker_id)
);

CREATE INDEX IF NOT EXISTS idx_applications_job_id ON applications(job_id);
CREATE INDEX IF NOT EXISTS idx_applications_seeker_id ON applications(seeker_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_zk_hash ON applications(zk_application_hash);

-- Reputation Events Table
CREATE TABLE IF NOT EXISTS reputation_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  delta INT NOT NULL,
  reason TEXT,
  zk_proof_hash TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reputation_events_user_id ON reputation_events(user_id);
CREATE INDEX IF NOT EXISTS idx_reputation_events_created_at ON reputation_events(created_at DESC);

-- ============================================
-- 3. Create Helper Functions
-- ============================================

-- updated_at trigger helper
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Helper function to set configuration for RLS policies
CREATE OR REPLACE FUNCTION set_config(setting_name TEXT, setting_value TEXT)
RETURNS void AS $$
BEGIN
  PERFORM set_config(setting_name, setting_value, false);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 4. Create Triggers
-- ============================================

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_jobs_updated_at ON jobs;
CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_applications_updated_at ON applications;
CREATE TRIGGER update_applications_updated_at BEFORE UPDATE ON applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 5. Enable Row Level Security
-- ============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE reputation_events ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 6. Create RLS Policies
-- ============================================

-- Drop existing policies if they exist (for re-running)
DROP POLICY IF EXISTS "Users read own data" ON users;
DROP POLICY IF EXISTS "Users update own data" ON users;
DROP POLICY IF EXISTS "Anyone can create user" ON users;
DROP POLICY IF EXISTS "Public job listings" ON jobs;
DROP POLICY IF EXISTS "Giver reads own jobs" ON jobs;
DROP POLICY IF EXISTS "Job giver creates job" ON jobs;
DROP POLICY IF EXISTS "Giver updates own jobs" ON jobs;
DROP POLICY IF EXISTS "Seeker applies to job" ON applications;
DROP POLICY IF EXISTS "Seeker reads own applications" ON applications;
DROP POLICY IF EXISTS "Giver views applications" ON applications;
DROP POLICY IF EXISTS "Giver updates applications" ON applications;
DROP POLICY IF EXISTS "Users read own reputation" ON reputation_events;
DROP POLICY IF EXISTS "System creates reputation events" ON reputation_events;

-- USERS Policies
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

-- JOBS Policies
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

-- APPLICATIONS Policies
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

-- REPUTATION Policies
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

-- ============================================
-- Setup Complete!
-- ============================================
-- You should now see 4 tables:
-- - users
-- - jobs
-- - applications
-- - reputation_events






