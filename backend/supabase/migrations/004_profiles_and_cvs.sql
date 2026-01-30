-- Profiles and CVs Tables
-- Migration 004: Add profiles and CVs tables for reputation scoring

-- ============================================
-- 1. Profiles Table
-- ============================================
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

CREATE INDEX IF NOT EXISTS idx_profiles_aleo_address ON profiles(aleo_address);
CREATE INDEX IF NOT EXISTS idx_profiles_profile_score ON profiles(profile_score DESC);

-- ============================================
-- 2. CVs Table
-- ============================================
CREATE TABLE IF NOT EXISTS cvs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  file_path TEXT NOT NULL,
  file_hash TEXT,
  file_size BIGINT,
  uploaded_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id) -- One CV per user
);

CREATE INDEX IF NOT EXISTS idx_cvs_user_id ON cvs(user_id);
CREATE INDEX IF NOT EXISTS idx_cvs_file_hash ON cvs(file_hash);

-- ============================================
-- 3. Update Trigger for profiles
-- ============================================
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 4. Enable Row Level Security
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE cvs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 5. RLS Policies for Profiles
-- ============================================
DROP POLICY IF EXISTS "Users read own profile" ON profiles;
CREATE POLICY "Users read own profile"
ON profiles
FOR SELECT
USING (
  aleo_address = current_setting('app.aleo_address', TRUE)
);

DROP POLICY IF EXISTS "Users update own profile" ON profiles;
CREATE POLICY "Users update own profile"
ON profiles
FOR UPDATE
USING (
  aleo_address = current_setting('app.aleo_address', TRUE)
);

DROP POLICY IF EXISTS "Anyone can create profile" ON profiles;
CREATE POLICY "Anyone can create profile"
ON profiles
FOR INSERT
WITH CHECK (true);

-- Public read for reputation scores (for employers)
DROP POLICY IF EXISTS "Public read profile scores" ON profiles;
CREATE POLICY "Public read profile scores"
ON profiles
FOR SELECT
USING (true);

-- ============================================
-- 6. RLS Policies for CVs
-- ============================================
DROP POLICY IF EXISTS "Users read own CV" ON cvs;
CREATE POLICY "Users read own CV"
ON cvs
FOR SELECT
USING (
  user_id IN (
    SELECT id FROM profiles
    WHERE aleo_address = current_setting('app.aleo_address', TRUE)
  )
);

DROP POLICY IF EXISTS "Users insert own CV" ON cvs;
CREATE POLICY "Users insert own CV"
ON cvs
FOR INSERT
WITH CHECK (
  user_id IN (
    SELECT id FROM profiles
    WHERE aleo_address = current_setting('app.aleo_address', TRUE)
  )
);

DROP POLICY IF EXISTS "Users update own CV" ON cvs;
CREATE POLICY "Users update own CV"
ON cvs
FOR UPDATE
USING (
  user_id IN (
    SELECT id FROM profiles
    WHERE aleo_address = current_setting('app.aleo_address', TRUE)
  )
);

DROP POLICY IF EXISTS "Users delete own CV" ON cvs;
CREATE POLICY "Users delete own CV"
ON cvs
FOR DELETE
USING (
  user_id IN (
    SELECT id FROM profiles
    WHERE aleo_address = current_setting('app.aleo_address', TRUE)
  )
);

-- ============================================
-- 7. Helper Function: Calculate Profile Score
-- ============================================
CREATE OR REPLACE FUNCTION calculate_profile_score(
  p_education_level TEXT,
  p_skills_count INT,
  p_experience_years INT,
  p_has_projects BOOLEAN DEFAULT false,
  p_cv_uploaded BOOLEAN DEFAULT false
)
RETURNS INT AS $$
DECLARE
  score INT := 0;
BEGIN
  -- Education present: +20
  IF p_education_level IS NOT NULL AND p_education_level != '' THEN
    score := score + 20;
  END IF;

  -- Skills ≥ 5: +20
  IF p_skills_count >= 5 THEN
    score := score + 20;
  END IF;

  -- Experience ≥ 2 yrs: +30
  IF p_experience_years >= 2 THEN
    score := score + 30;
  END IF;

  -- Verified projects: +20
  IF p_has_projects THEN
    score := score + 20;
  END IF;

  -- CV uploaded: +10
  IF p_cv_uploaded THEN
    score := score + 10;
  END IF;

  -- Cap at 100
  RETURN LEAST(score, 100);
END;
$$ LANGUAGE plpgsql;


