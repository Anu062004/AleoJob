-- Migration 005: Immutable roles, role-based onboarding, and work-proof lifecycle

-- ============================================
-- 1. Profiles: role lock + reputation metrics
-- ============================================
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS role TEXT CHECK (role IN ('seeker', 'giver')),
  ADD COLUMN IF NOT EXISTS role_locked BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS jobs_posted INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_escrow_generated NUMERIC(20, 4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS completed_jobs INT NOT NULL DEFAULT 0;

UPDATE profiles
SET role_locked = true
WHERE role IS NOT NULL
  AND role_locked = false;

CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

CREATE OR REPLACE FUNCTION enforce_profile_role_lock()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role IS NOT NULL AND NEW.role NOT IN ('seeker', 'giver') THEN
    RAISE EXCEPTION 'Invalid role. Must be seeker or giver.';
  END IF;

  IF OLD.role IS NOT NULL
     AND OLD.role_locked = true
     AND NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Role is immutable once assigned for this wallet.';
  END IF;

  IF NEW.role IS NOT NULL THEN
    NEW.role_locked := true;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_profile_role_lock ON profiles;
CREATE TRIGGER enforce_profile_role_lock
BEFORE INSERT OR UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION enforce_profile_role_lock();

-- ============================================
-- 2. Applications: on-chain work-proof fields
-- ============================================
ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS work_proof_hash TEXT,
  ADD COLUMN IF NOT EXISTS work_proof_tx TEXT,
  ADD COLUMN IF NOT EXISTS work_proof_status TEXT NOT NULL DEFAULT 'not_submitted'
    CHECK (work_proof_status IN ('not_submitted', 'submitted', 'verified', 'rejected')),
  ADD COLUMN IF NOT EXISTS work_proof_submitted_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS work_proof_verified_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS work_proof_notes TEXT;

CREATE INDEX IF NOT EXISTS idx_applications_work_proof_status ON applications(work_proof_status);
CREATE INDEX IF NOT EXISTS idx_applications_work_proof_tx ON applications(work_proof_tx);

-- ============================================
-- 3. RLS tightening: role-locked create paths
-- ============================================
DROP POLICY IF EXISTS "Anyone can create jobs" ON jobs;
DROP POLICY IF EXISTS "Job giver creates job" ON jobs;
CREATE POLICY "Role-locked giver creates jobs"
ON jobs FOR INSERT
WITH CHECK (
  giver_id IN (
    SELECT id
    FROM profiles
    WHERE aleo_address = current_setting('app.aleo_address', TRUE)
      AND role = 'giver'
      AND role_locked = true
  )
);

DROP POLICY IF EXISTS "Anyone can create applications" ON applications;
DROP POLICY IF EXISTS "Seeker applies to job" ON applications;
CREATE POLICY "Role-locked seeker creates applications"
ON applications FOR INSERT
WITH CHECK (
  seeker_id IN (
    SELECT id
    FROM profiles
    WHERE aleo_address = current_setting('app.aleo_address', TRUE)
      AND role = 'seeker'
      AND role_locked = true
  )
);

