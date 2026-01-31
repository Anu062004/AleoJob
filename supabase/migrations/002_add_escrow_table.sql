-- Escrow Table Migration
-- Adds escrow functionality for job payments

-- Escrow Table
CREATE TABLE escrows (
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

-- Create indexes for escrows
CREATE INDEX idx_escrows_job_id ON escrows(job_id);
CREATE INDEX idx_escrows_employer_id ON escrows(employer_id);
CREATE INDEX idx_escrows_freelancer_id ON escrows(freelancer_id);
CREATE INDEX idx_escrows_status ON escrows(status);
CREATE INDEX idx_escrows_created_at ON escrows(created_at DESC);

-- Add payment_status column to jobs table if it doesn't exist
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

-- Create index on payment_status
CREATE INDEX IF NOT EXISTS idx_jobs_payment_status ON jobs(payment_status);

-- Trigger to auto-update updated_at
CREATE TRIGGER update_escrows_updated_at BEFORE UPDATE ON escrows
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comment
COMMENT ON TABLE escrows IS 'Stores escrow records for job payments on Aleo blockchain';

