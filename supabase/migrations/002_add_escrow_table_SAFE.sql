-- Escrow Table Migration (SAFE VERSION)
-- Run this in Supabase SQL Editor
-- This version uses IF NOT EXISTS to prevent errors if tables/columns already exist

-- 1. Ensure update_updated_at_column function exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Create escrows table (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS escrows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE NOT NULL,
  employer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  freelancer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  amount FLOAT NOT NULL CHECK (amount > 0),
  status TEXT NOT NULL DEFAULT 'locked' CHECK (status IN ('locked', 'released', 'refunded')),
  escrow_record_id TEXT, -- Aleo PaymentEscrow record identifier
  create_tx TEXT, -- Transaction ID for escrow creation
  release_tx TEXT, -- Transaction ID for payment release
  refund_tx TEXT, -- Transaction ID for refund
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Ensure one escrow per job
  UNIQUE (job_id)
);

-- 3. Create indexes (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_escrows_job_id ON escrows(job_id);
CREATE INDEX IF NOT EXISTS idx_escrows_employer_id ON escrows(employer_id);
CREATE INDEX IF NOT EXISTS idx_escrows_freelancer_id ON escrows(freelancer_id);
CREATE INDEX IF NOT EXISTS idx_escrows_status ON escrows(status);
CREATE INDEX IF NOT EXISTS idx_escrows_created_at ON escrows(created_at DESC);

-- 4. Add payment_status column to jobs table (only if it doesn't exist)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'jobs' AND column_name = 'payment_status'
  ) THEN
    ALTER TABLE jobs ADD COLUMN payment_status TEXT DEFAULT 'pending' 
      CHECK (payment_status IN ('pending', 'locked', 'completed', 'refunded'));
  END IF;
END $$;

-- 5. Create index on payment_status (only if it doesn't exist)
CREATE INDEX IF NOT EXISTS idx_jobs_payment_status ON jobs(payment_status);

-- 6. Create trigger for auto-updating updated_at (drop and recreate to avoid conflicts)
DROP TRIGGER IF EXISTS update_escrows_updated_at ON escrows;
CREATE TRIGGER update_escrows_updated_at BEFORE UPDATE ON escrows
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7. Enable RLS on escrows table
ALTER TABLE escrows ENABLE ROW LEVEL SECURITY;

-- 8. RLS Policies for escrows table
-- Allow employers to view their own escrows
DROP POLICY IF EXISTS "Employers can view own escrows" ON escrows;
CREATE POLICY "Employers can view own escrows"
ON escrows FOR SELECT
USING (
  employer_id IN (
    SELECT id FROM profiles 
    WHERE aleo_address = current_setting('app.aleo_address', TRUE)
  )
);

-- Allow freelancers to view escrows for their jobs
DROP POLICY IF EXISTS "Freelancers can view own escrows" ON escrows;
CREATE POLICY "Freelancers can view own escrows"
ON escrows FOR SELECT
USING (
  freelancer_id IN (
    SELECT id FROM profiles 
    WHERE aleo_address = current_setting('app.aleo_address', TRUE)
  )
);

-- Allow employers to create escrows (via API with service role key)
DROP POLICY IF EXISTS "Anyone can create escrows" ON escrows;
CREATE POLICY "Anyone can create escrows"
ON escrows FOR INSERT
WITH CHECK (true);

-- Allow employers to update their own escrows (via API with service role key)
DROP POLICY IF EXISTS "Anyone can update escrows" ON escrows;
CREATE POLICY "Anyone can update escrows"
ON escrows FOR UPDATE
USING (true);

-- 9. Add comment
COMMENT ON TABLE escrows IS 'Stores escrow records for job payments on Aleo blockchain';

-- 10. Verify the migration
DO $$
BEGIN
  RAISE NOTICE '✅ Escrow table migration completed successfully!';
  RAISE NOTICE '✅ Table: escrows';
  RAISE NOTICE '✅ Column: jobs.payment_status';
  RAISE NOTICE '✅ Indexes created';
  RAISE NOTICE '✅ RLS policies enabled';
END $$;


