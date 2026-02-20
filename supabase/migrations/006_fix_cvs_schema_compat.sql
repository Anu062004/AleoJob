-- Migration 006: Normalize CV table schema for production compatibility
-- Keeps backward compatibility if an older/manual schema used profile_id/file_url.

CREATE TABLE IF NOT EXISTS public.cvs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID,
  file_path TEXT,
  file_hash TEXT,
  file_size BIGINT,
  uploaded_at TIMESTAMP DEFAULT NOW()
);

-- Normalize legacy column names to current app contract.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'cvs' AND column_name = 'profile_id'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'cvs' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.cvs RENAME COLUMN profile_id TO user_id;
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'cvs' AND column_name = 'file_url'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'cvs' AND column_name = 'file_path'
  ) THEN
    ALTER TABLE public.cvs RENAME COLUMN file_url TO file_path;
  END IF;
END
$$;

ALTER TABLE public.cvs ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.cvs ADD COLUMN IF NOT EXISTS file_path TEXT;
ALTER TABLE public.cvs ADD COLUMN IF NOT EXISTS file_hash TEXT;
ALTER TABLE public.cvs ADD COLUMN IF NOT EXISTS file_size BIGINT;
ALTER TABLE public.cvs ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMP DEFAULT NOW();

-- Backfill user_id if both old/new columns exist.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'cvs' AND column_name = 'profile_id'
  ) THEN
    EXECUTE 'UPDATE public.cvs SET user_id = profile_id WHERE user_id IS NULL';
  END IF;
END
$$;

DROP INDEX IF EXISTS public.idx_cvs_profile_id;
CREATE INDEX IF NOT EXISTS idx_cvs_user_id ON public.cvs(user_id);
CREATE INDEX IF NOT EXISTS idx_cvs_file_hash ON public.cvs(file_hash);

-- Ensure one CV per profile if data already allows it.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'cvs_user_id_key'
      AND conrelid = 'public.cvs'::regclass
  ) THEN
    IF NOT EXISTS (
      SELECT user_id
      FROM public.cvs
      WHERE user_id IS NOT NULL
      GROUP BY user_id
      HAVING COUNT(*) > 1
    ) THEN
      ALTER TABLE public.cvs ADD CONSTRAINT cvs_user_id_key UNIQUE (user_id);
    ELSE
      RAISE NOTICE 'Skipping cvs_user_id_key creation due to duplicate user_id rows.';
    END IF;
  END IF;
END
$$;

-- Keep FK discoverable for PostgREST embedding; use NOT VALID to avoid hard-failing on dirty legacy rows.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'cvs_user_id_fkey'
      AND conrelid = 'public.cvs'::regclass
  ) THEN
    ALTER TABLE public.cvs
      ADD CONSTRAINT cvs_user_id_fkey
      FOREIGN KEY (user_id)
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
    WHERE conname = 'cvs_user_id_fkey'
      AND conrelid = 'public.cvs'::regclass
  ) THEN
    BEGIN
      ALTER TABLE public.cvs VALIDATE CONSTRAINT cvs_user_id_fkey;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'cvs_user_id_fkey exists but could not be validated. Fix orphan rows and validate manually.';
    END;
  END IF;
END
$$;

ALTER TABLE public.cvs ENABLE ROW LEVEL SECURITY;

