-- Migration 008: Align profile-based backend contract (roles, FKs, RLS)
-- This normalizes legacy users-based references to profiles-based references.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE OR REPLACE FUNCTION public.set_app_config(setting_name TEXT, setting_value TEXT)
RETURNS void AS $$
BEGIN
  PERFORM pg_catalog.set_config(setting_name, setting_value, false);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  aleo_address TEXT UNIQUE NOT NULL,
  name TEXT,
  skills TEXT[] DEFAULT '{}',
  experience_years INT DEFAULT 0,
  education_level TEXT,
  profile_score INT DEFAULT 0,
  role TEXT CHECK (role IN ('seeker', 'giver')),
  role_locked BOOLEAN NOT NULL DEFAULT false,
  email TEXT,
  jobs_posted INT NOT NULL DEFAULT 0,
  total_escrow_generated NUMERIC(20, 4) NOT NULL DEFAULT 0,
  completed_jobs INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS skills TEXT[] DEFAULT '{}';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS experience_years INT DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS education_level TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS profile_score INT DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT CHECK (role IN ('seeker', 'giver'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role_locked BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS jobs_posted INT NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS total_escrow_generated NUMERIC(20, 4) NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS completed_jobs INT NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_profiles_aleo_address ON public.profiles(aleo_address);
CREATE INDEX IF NOT EXISTS idx_profiles_profile_score ON public.profiles(profile_score DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.enforce_profile_role_lock()
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

DROP TRIGGER IF EXISTS enforce_profile_role_lock ON public.profiles;
CREATE TRIGGER enforce_profile_role_lock
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.enforce_profile_role_lock();

CREATE TABLE IF NOT EXISTS public.cvs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  file_path TEXT NOT NULL,
  file_hash TEXT,
  file_size BIGINT,
  uploaded_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id)
);

ALTER TABLE public.cvs ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.cvs ADD COLUMN IF NOT EXISTS file_path TEXT;
ALTER TABLE public.cvs ADD COLUMN IF NOT EXISTS file_hash TEXT;
ALTER TABLE public.cvs ADD COLUMN IF NOT EXISTS file_size BIGINT;
ALTER TABLE public.cvs ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMP DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_cvs_user_id ON public.cvs(user_id);
CREATE INDEX IF NOT EXISTS idx_cvs_file_hash ON public.cvs(file_hash);

DO $$
BEGIN
  IF to_regclass('public.users') IS NOT NULL THEN
    INSERT INTO public.profiles (
      aleo_address,
      role,
      role_locked,
      profile_score,
      created_at,
      updated_at
    )
    SELECT
      u.aleo_address,
      CASE WHEN u.role IN ('seeker', 'giver') THEN u.role ELSE NULL END,
      CASE WHEN u.role IN ('seeker', 'giver') THEN true ELSE false END,
      COALESCE(u.reputation_score, 0),
      COALESCE(u.created_at, NOW()),
      COALESCE(u.updated_at, NOW())
    FROM public.users u
    LEFT JOIN public.profiles p
      ON p.aleo_address = u.aleo_address
    WHERE p.id IS NULL;

    UPDATE public.profiles p
    SET
      role = u.role,
      role_locked = CASE WHEN u.role IN ('seeker', 'giver') THEN true ELSE p.role_locked END,
      updated_at = NOW()
    FROM public.users u
    WHERE p.aleo_address = u.aleo_address
      AND p.role IS NULL
      AND u.role IN ('seeker', 'giver');
  END IF;
END
$$;

DO $$
BEGIN
  IF to_regclass('public.users') IS NOT NULL AND to_regclass('public.jobs') IS NOT NULL THEN
    UPDATE public.jobs j
    SET giver_id = p.id
    FROM public.users u
    JOIN public.profiles p
      ON p.aleo_address = u.aleo_address
    WHERE j.giver_id = u.id
      AND j.giver_id IS DISTINCT FROM p.id;
  END IF;
END
$$;

DO $$
BEGIN
  IF to_regclass('public.users') IS NOT NULL AND to_regclass('public.applications') IS NOT NULL THEN
    UPDATE public.applications a
    SET seeker_id = p.id
    FROM public.users u
    JOIN public.profiles p
      ON p.aleo_address = u.aleo_address
    WHERE a.seeker_id = u.id
      AND a.seeker_id IS DISTINCT FROM p.id;
  END IF;
END
$$;

DO $$
DECLARE
  fk RECORD;
BEGIN
  IF to_regclass('public.jobs') IS NOT NULL AND to_regclass('public.users') IS NOT NULL THEN
    FOR fk IN
      SELECT conname
      FROM pg_constraint
      WHERE conrelid = 'public.jobs'::regclass
        AND contype = 'f'
        AND confrelid = 'public.users'::regclass
    LOOP
      EXECUTE format('ALTER TABLE public.jobs DROP CONSTRAINT %I', fk.conname);
    END LOOP;
  END IF;
END
$$;

DO $$
DECLARE
  fk RECORD;
BEGIN
  IF to_regclass('public.applications') IS NOT NULL AND to_regclass('public.users') IS NOT NULL THEN
    FOR fk IN
      SELECT conname
      FROM pg_constraint
      WHERE conrelid = 'public.applications'::regclass
        AND contype = 'f'
        AND confrelid = 'public.users'::regclass
    LOOP
      EXECUTE format('ALTER TABLE public.applications DROP CONSTRAINT %I', fk.conname);
    END LOOP;
  END IF;
END
$$;

DO $$
BEGIN
  IF to_regclass('public.jobs') IS NOT NULL
     AND to_regclass('public.profiles') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_constraint
       WHERE conname = 'jobs_giver_id_fkey'
         AND conrelid = 'public.jobs'::regclass
     ) THEN
    ALTER TABLE public.jobs
      ADD CONSTRAINT jobs_giver_id_fkey
      FOREIGN KEY (giver_id)
      REFERENCES public.profiles(id)
      ON DELETE CASCADE
      NOT VALID;
  END IF;
END
$$;

DO $$
BEGIN
  IF to_regclass('public.applications') IS NOT NULL
     AND to_regclass('public.profiles') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_constraint
       WHERE conname = 'applications_seeker_id_fkey'
         AND conrelid = 'public.applications'::regclass
     ) THEN
    ALTER TABLE public.applications
      ADD CONSTRAINT applications_seeker_id_fkey
      FOREIGN KEY (seeker_id)
      REFERENCES public.profiles(id)
      ON DELETE CASCADE
      NOT VALID;
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'jobs_giver_id_fkey'
      AND conrelid = 'public.jobs'::regclass
  ) THEN
    BEGIN
      ALTER TABLE public.jobs VALIDATE CONSTRAINT jobs_giver_id_fkey;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'jobs_giver_id_fkey could not be validated. Check orphan rows in jobs.giver_id.';
    END;
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'applications_seeker_id_fkey'
      AND conrelid = 'public.applications'::regclass
  ) THEN
    BEGIN
      ALTER TABLE public.applications VALIDATE CONSTRAINT applications_seeker_id_fkey;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'applications_seeker_id_fkey could not be validated. Check orphan rows in applications.seeker_id.';
    END;
  END IF;
END
$$;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cvs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own profile" ON public.profiles;
CREATE POLICY "Users read own profile"
ON public.profiles
FOR SELECT
USING (
  aleo_address = current_setting('app.aleo_address', TRUE)
);

DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users update own profile"
ON public.profiles
FOR UPDATE
USING (
  aleo_address = current_setting('app.aleo_address', TRUE)
);

DROP POLICY IF EXISTS "Anyone can create profile" ON public.profiles;
CREATE POLICY "Anyone can create profile"
ON public.profiles
FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "Public read profile scores" ON public.profiles;
CREATE POLICY "Public read profile scores"
ON public.profiles
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Users read own CV" ON public.cvs;
CREATE POLICY "Users read own CV"
ON public.cvs
FOR SELECT
USING (
  user_id IN (
    SELECT id
    FROM public.profiles
    WHERE aleo_address = current_setting('app.aleo_address', TRUE)
  )
);

DROP POLICY IF EXISTS "Users insert own CV" ON public.cvs;
CREATE POLICY "Users insert own CV"
ON public.cvs
FOR INSERT
WITH CHECK (
  user_id IN (
    SELECT id
    FROM public.profiles
    WHERE aleo_address = current_setting('app.aleo_address', TRUE)
  )
);

DROP POLICY IF EXISTS "Users update own CV" ON public.cvs;
CREATE POLICY "Users update own CV"
ON public.cvs
FOR UPDATE
USING (
  user_id IN (
    SELECT id
    FROM public.profiles
    WHERE aleo_address = current_setting('app.aleo_address', TRUE)
  )
);

DROP POLICY IF EXISTS "Users delete own CV" ON public.cvs;
CREATE POLICY "Users delete own CV"
ON public.cvs
FOR DELETE
USING (
  user_id IN (
    SELECT id
    FROM public.profiles
    WHERE aleo_address = current_setting('app.aleo_address', TRUE)
  )
);

DROP POLICY IF EXISTS "Public job listings" ON public.jobs;
CREATE POLICY "Public job listings"
ON public.jobs
FOR SELECT
USING (is_active = TRUE);

DROP POLICY IF EXISTS "Giver reads own jobs" ON public.jobs;
CREATE POLICY "Giver reads own jobs"
ON public.jobs
FOR SELECT
USING (
  giver_id IN (
    SELECT id
    FROM public.profiles
    WHERE aleo_address = current_setting('app.aleo_address', TRUE)
      AND role = 'giver'
      AND role_locked = true
  )
);

DROP POLICY IF EXISTS "Anyone can create jobs" ON public.jobs;
DROP POLICY IF EXISTS "Job giver creates job" ON public.jobs;
DROP POLICY IF EXISTS "Role-locked giver creates jobs" ON public.jobs;
CREATE POLICY "Role-locked giver creates jobs"
ON public.jobs
FOR INSERT
WITH CHECK (
  giver_id IN (
    SELECT id
    FROM public.profiles
    WHERE aleo_address = current_setting('app.aleo_address', TRUE)
      AND role = 'giver'
      AND role_locked = true
  )
);

DROP POLICY IF EXISTS "Giver updates own jobs" ON public.jobs;
CREATE POLICY "Giver updates own jobs"
ON public.jobs
FOR UPDATE
USING (
  giver_id IN (
    SELECT id
    FROM public.profiles
    WHERE aleo_address = current_setting('app.aleo_address', TRUE)
      AND role = 'giver'
      AND role_locked = true
  )
);

DROP POLICY IF EXISTS "Anyone can create applications" ON public.applications;
DROP POLICY IF EXISTS "Seeker applies to job" ON public.applications;
DROP POLICY IF EXISTS "Role-locked seeker creates applications" ON public.applications;
CREATE POLICY "Role-locked seeker creates applications"
ON public.applications
FOR INSERT
WITH CHECK (
  seeker_id IN (
    SELECT id
    FROM public.profiles
    WHERE aleo_address = current_setting('app.aleo_address', TRUE)
      AND role = 'seeker'
      AND role_locked = true
  )
);

DROP POLICY IF EXISTS "Seeker reads own applications" ON public.applications;
CREATE POLICY "Seeker reads own applications"
ON public.applications
FOR SELECT
USING (
  seeker_id IN (
    SELECT id
    FROM public.profiles
    WHERE aleo_address = current_setting('app.aleo_address', TRUE)
      AND role = 'seeker'
      AND role_locked = true
  )
);

DROP POLICY IF EXISTS "Giver views applications" ON public.applications;
CREATE POLICY "Giver views applications"
ON public.applications
FOR SELECT
USING (
  job_id IN (
    SELECT id
    FROM public.jobs
    WHERE giver_id IN (
      SELECT id
      FROM public.profiles
      WHERE aleo_address = current_setting('app.aleo_address', TRUE)
        AND role = 'giver'
        AND role_locked = true
    )
  )
);

DROP POLICY IF EXISTS "Giver updates applications" ON public.applications;
CREATE POLICY "Giver updates applications"
ON public.applications
FOR UPDATE
USING (
  job_id IN (
    SELECT id
    FROM public.jobs
    WHERE giver_id IN (
      SELECT id
      FROM public.profiles
      WHERE aleo_address = current_setting('app.aleo_address', TRUE)
        AND role = 'giver'
        AND role_locked = true
    )
  )
);

