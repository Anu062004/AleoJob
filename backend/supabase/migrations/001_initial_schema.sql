-- AleoJob Database Schema
-- Initial migration for users, jobs, applications, and reputation tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users Table (Minimal & Anonymous)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  aleo_address TEXT UNIQUE NOT NULL,
  role TEXT CHECK (role IN ('giver', 'seeker')) NOT NULL,
  reputation_score INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_aleo_address ON users(aleo_address);
CREATE INDEX idx_users_role ON users(role);

-- Jobs Table
CREATE TABLE jobs (
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

CREATE INDEX idx_jobs_giver_id ON jobs(giver_id);
CREATE INDEX idx_jobs_is_active ON jobs(is_active);
CREATE INDEX idx_jobs_zk_hash ON jobs(zk_membership_hash);
CREATE INDEX idx_jobs_created_at ON jobs(created_at DESC);

-- Applications Table
CREATE TABLE applications (
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

CREATE INDEX idx_applications_job_id ON applications(job_id);
CREATE INDEX idx_applications_seeker_id ON applications(seeker_id);
CREATE INDEX idx_applications_status ON applications(status);
CREATE INDEX idx_applications_zk_hash ON applications(zk_application_hash);

-- Reputation Events Table
CREATE TABLE reputation_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  delta INT NOT NULL,
  reason TEXT,
  zk_proof_hash TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_reputation_events_user_id ON reputation_events(user_id);
CREATE INDEX idx_reputation_events_created_at ON reputation_events(created_at DESC);

-- updated_at trigger helper
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_applications_updated_at BEFORE UPDATE ON applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


