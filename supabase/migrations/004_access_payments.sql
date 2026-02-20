-- Access payments table
-- Stores verified Aleo access transactions so access can be revalidated without browser-local flags.

CREATE TABLE IF NOT EXISTS access_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  aleo_address TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('seeker', 'giver')),
  transaction_id TEXT NOT NULL,
  transaction_status TEXT DEFAULT 'unknown',
  proof_verified BOOLEAN DEFAULT false,
  has_access BOOLEAN DEFAULT false,
  proof_reference TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (aleo_address, role)
);

CREATE INDEX IF NOT EXISTS idx_access_payments_address ON access_payments(aleo_address);
CREATE INDEX IF NOT EXISTS idx_access_payments_role ON access_payments(role);
CREATE INDEX IF NOT EXISTS idx_access_payments_txid ON access_payments(transaction_id);

ALTER TABLE access_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own access payments" ON access_payments;
CREATE POLICY "Users can view own access payments"
ON access_payments
FOR SELECT
USING (
  aleo_address = current_setting('app.aleo_address', TRUE)
);

DROP POLICY IF EXISTS "Users can insert own access payments" ON access_payments;
CREATE POLICY "Users can insert own access payments"
ON access_payments
FOR INSERT
WITH CHECK (
  aleo_address = current_setting('app.aleo_address', TRUE)
);

DROP POLICY IF EXISTS "Users can update own access payments" ON access_payments;
CREATE POLICY "Users can update own access payments"
ON access_payments
FOR UPDATE
USING (
  aleo_address = current_setting('app.aleo_address', TRUE)
);

DROP TRIGGER IF EXISTS update_access_payments_updated_at ON access_payments;
CREATE TRIGGER update_access_payments_updated_at
BEFORE UPDATE ON access_payments
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
