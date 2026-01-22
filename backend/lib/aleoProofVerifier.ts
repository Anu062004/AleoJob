// Aleo Proof Verifier

export async function verifyZKProofHash(
  zkHash: string,
  _expectedProgram: string,
  _expectedFunction: string,
  _aleoAddress: string
): Promise<boolean> {
  // Minimal validation for now (format only).
  // You can later query explorer and match tx/program/function.
  return /^[a-f0-9]{64}$/i.test(zkHash);
}

export async function isZKHashUnique(
  zkHash: string,
  tableName: 'jobs' | 'applications',
  supabaseClient: any
): Promise<boolean> {
  const hashField = tableName === 'jobs' ? 'zk_membership_hash' : 'zk_application_hash';
  const { data, error } = await supabaseClient.from(tableName).select('id').eq(hashField, zkHash).limit(1);
  if (error) return false;
  return !data || data.length === 0;
}


