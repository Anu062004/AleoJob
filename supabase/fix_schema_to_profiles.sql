-- Consolidation Migration: Use 'profiles' instead of 'users'
-- Run this in the Supabase SQL Editor to fix the "Could not find table public.users" error

-- 1. Ensure 'profiles' table exists (Migration 004 already does this, but safely repeat)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  aleo_address TEXT UNIQUE NOT NULL,
  name TEXT,
  skills TEXT[] DEFAULT '{}',
  experience_years INT DEFAULT 0,
  education_level TEXT,
  profile_score INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Ensure 'jobs' table exists and references 'profiles'
CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  giver_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  skills TEXT[],
  budget TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  zk_membership_hash TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. Ensure 'applications' table exists and references 'profiles'
CREATE TABLE IF NOT EXISTS applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE NOT NULL,
  seeker_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  encrypted_resume_url TEXT,
  encrypted_cover_letter TEXT,
  zk_application_hash TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (job_id, seeker_id)
);

-- 4. Enable RLS on new tables (if not already done)
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;


-- 5. Fix any existing FKs if 'users' existed but we want 'profiles'
-- (Only necessary if you had 'users' and want to move data, but since it's missing, 'CREATE TABLE IF NOT EXISTS' handles it)

-- 6. Helper function to set configuration for RLS policies
-- This allows RLS policies to access the current user's Aleo address
-- Named 'set_app_config' to avoid conflict with PostgreSQL's built-in 'set_config' function
DROP FUNCTION IF EXISTS set_config(TEXT, TEXT);
CREATE OR REPLACE FUNCTION set_app_config(setting_name TEXT, setting_value TEXT)
RETURNS void AS $$
BEGIN
  PERFORM set_config(setting_name, setting_value, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. RLS Policies for profiles table
-- Allow anyone to read profiles (for job listings to show giver info)
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
CREATE POLICY "Public profiles are viewable by everyone"
ON profiles FOR SELECT
USING (true);

-- Allow anyone to insert profiles (for registration)
DROP POLICY IF EXISTS "Anyone can create a profile" ON profiles;
CREATE POLICY "Anyone can create a profile"
ON profiles FOR INSERT
WITH CHECK (true);

-- Allow users to update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (aleo_address = current_setting('app.aleo_address', TRUE));

-- 8. RLS Policies for jobs table
-- Allow anyone to read active jobs
DROP POLICY IF EXISTS "Anyone can view active jobs" ON jobs;
CREATE POLICY "Anyone can view active jobs"
ON jobs FOR SELECT
USING (is_active = true);

-- Allow anyone to insert jobs (giver creates job)
DROP POLICY IF EXISTS "Anyone can create jobs" ON jobs;
CREATE POLICY "Anyone can create jobs"
ON jobs FOR INSERT
WITH CHECK (true);

-- Allow job owners to update their jobs
DROP POLICY IF EXISTS "Job owners can update their jobs" ON jobs;
CREATE POLICY "Job owners can update their jobs"
ON jobs FOR UPDATE
USING (
  giver_id IN (
    SELECT id FROM profiles 
    WHERE aleo_address = current_setting('app.aleo_address', TRUE)
  )
);

-- 9. RLS Policies for applications table
-- Allow anyone to insert applications
DROP POLICY IF EXISTS "Anyone can create applications" ON applications;
CREATE POLICY "Anyone can create applications"
ON applications FOR INSERT
WITH CHECK (true);

-- Allow users to view their own applications
DROP POLICY IF EXISTS "Users can view own applications" ON applications;
CREATE POLICY "Users can view own applications"
ON applications FOR SELECT
USING (
  seeker_id IN (
    SELECT id FROM profiles 
    WHERE aleo_address = current_setting('app.aleo_address', TRUE)
  )
  OR
  job_id IN (
    SELECT id FROM jobs 
    WHERE giver_id IN (
      SELECT id FROM profiles 
      WHERE aleo_address = current_setting('app.aleo_address', TRUE)
    )
  )
);
