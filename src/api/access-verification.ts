import { createClient } from '@supabase/supabase-js';
import type { Request, Response } from 'express';
import { ALEO_CONFIG } from '../../lib/aleo-config';
import { aleoService } from '../../lib/aleo-service';

type AccessRole = 'seeker' | 'giver';
type PaymentSource = 'provided' | 'cache' | 'none';

type AccessRoleConfig = {
  functionName: string;
  recordName: string;
};

export type AccessVerificationResult = {
  aleoAddress: string;
  role: AccessRole;
  hasAccess: boolean;
  proofVerified: boolean;
  source: 'record' | 'transaction' | 'none';
  proofReference: string;
  matchingRecordCount: number;
  transaction: {
    id: string;
    status: string;
    verified: boolean;
    source: PaymentSource;
  } | null;
  warnings: {
    records?: string;
    transaction?: string;
  };
};

const ACCESS_ROLE_CONFIG: Record<AccessRole, AccessRoleConfig> = {
  seeker: {
    functionName: 'pay_job_seeker_access',
    recordName: 'JobSeekerAccess',
  },
  giver: {
    functionName: 'pay_job_giver_access',
    recordName: 'JobGiverAccess',
  },
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabaseAdmin =
  supabaseUrl && serviceRoleKey
    ? createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : null;

type ProfileRoleState = {
  role: AccessRole | null;
};

function normalizeText(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.trim();
}

function extractStatusFromCandidate(candidate: unknown): string {
  if (!candidate) return '';
  if (typeof candidate === 'string') return candidate.trim().toLowerCase();

  if (typeof candidate === 'object') {
    const objectCandidate = candidate as Record<string, unknown>;
    const nestedKeys = ['status', 'state', 'type', 'result', 'finalize_status'];

    for (const key of nestedKeys) {
      const nested = objectCandidate[key];
      if (typeof nested === 'string' && nested.trim()) {
        return nested.trim().toLowerCase();
      }
    }
  }

  return '';
}

function buildProgramIdVariants(expectedProgramId: string): string[] {
  const normalized = normalizeText(expectedProgramId).toLowerCase();
  if (!normalized) return [];

  const variants = new Set<string>([normalized]);
  if (normalized.endsWith('_v2.aleo')) {
    variants.add(normalized.replace('_v2.aleo', '.aleo'));
  } else if (normalized.endsWith('.aleo')) {
    variants.add(normalized.replace('.aleo', '_v2.aleo'));
  }

  return Array.from(variants);
}

function extractRecordId(record: Record<string, unknown>): string {
  const candidates = [
    record.id,
    record.record_id,
    record.recordId,
    record.commitment,
    record.ciphertext,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
  }

  return '';
}

function isSpentRecord(record: Record<string, unknown>): boolean {
  if (record.spent === true) return true;
  if (record.is_spent === true) return true;
  if (typeof record.spent_at === 'string' && record.spent_at.trim()) return true;
  return false;
}

function normalizeTransactionStatus(transaction: any): string {
  const candidates = [
    transaction?.status,
    transaction?.transaction?.status,
    transaction?.transaction?.transaction?.status,
    transaction?.finalize_status,
    transaction?.execution?.status,
    transaction?.execution?.state,
    transaction?.transaction?.execution?.status,
    transaction?.transaction?.execution?.state,
    transaction?.state,
    transaction?.type,
    transaction?.transaction?.state,
    transaction?.transaction?.type,
  ];

  for (const candidate of candidates) {
    const normalized = extractStatusFromCandidate(candidate);
    if (normalized) {
      return normalized;
    }
  }

  const txText = JSON.stringify(transaction).toLowerCase();
  if (txText.includes('"confirmed"') || txText.includes('"accepted"') || txText.includes('"finalized"')) {
    return 'confirmed';
  }
  if (txText.includes('"pending"') || txText.includes('"processing"')) {
    return 'pending';
  }
  if (txText.includes('"failed"') || txText.includes('"rejected"') || txText.includes('"aborted"')) {
    return 'failed';
  }

  return 'unknown';
}

function isFailedStatus(status: string): boolean {
  return ['failed', 'failure', 'rejected', 'aborted', 'error', 'invalid'].includes(status);
}

function isConfirmedStatus(status: string): boolean {
  return ['confirmed', 'accepted', 'finalized', 'completed', 'success', 'included', 'settled'].includes(status);
}

function hasAccessRecord(
  records: Array<Record<string, unknown>>,
  expectedRecordName: string
): Array<Record<string, unknown>> {
  const expectedLower = expectedRecordName.toLowerCase();

  return records.filter((record) => {
    if (isSpentRecord(record)) return false;

    const haystack = JSON.stringify(record).toLowerCase();
    if (!haystack) return false;

    return haystack.includes(expectedLower);
  });
}

function verifyAccessPaymentTransaction(options: {
  transaction: unknown;
  expectedProgramId: string;
  expectedFunctionName: string;
  aleoAddress: string;
}): boolean {
  const { transaction, expectedProgramId, expectedFunctionName, aleoAddress } = options;

  if (!transaction) return false;

  const txText = JSON.stringify(transaction).toLowerCase();
  if (!txText) return false;

  const expectedPrograms = buildProgramIdVariants(expectedProgramId);
  const hasProgram = expectedPrograms.some((programId) => txText.includes(programId));
  const hasFunction = txText.includes(expectedFunctionName.toLowerCase());
  const hasAddress = !aleoAddress || txText.includes(aleoAddress.toLowerCase());

  return hasProgram && hasFunction && hasAddress;
}

function buildProofReference(options: {
  source: 'record' | 'transaction' | 'none';
  matchingRecords: Array<Record<string, unknown>>;
  transactionId: string;
}): string {
  if (options.source === 'record' && options.matchingRecords.length > 0) {
    const recordId = extractRecordId(options.matchingRecords[0]);
    if (recordId) {
      return `record:${recordId}`;
    }
  }

  if (options.source === 'transaction' && options.transactionId) {
    return `tx:${options.transactionId}`;
  }

  return '';
}

async function getCachedTransactionId(
  aleoAddress: string,
  role: AccessRole
): Promise<string> {
  if (!supabaseAdmin) return '';

  try {
    const { data, error } = await supabaseAdmin
      .from('access_payments')
      .select('transaction_id')
      .eq('aleo_address', aleoAddress)
      .eq('role', role)
      .single();

    if (error || !data?.transaction_id) {
      return '';
    }

    return data.transaction_id;
  } catch {
    return '';
  }
}

async function getProfileRoleState(aleoAddress: string): Promise<ProfileRoleState | null> {
  if (!supabaseAdmin) return null;

  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('role, role_locked')
      .eq('aleo_address', aleoAddress)
      .maybeSingle();

    if (error || !data) return null;

    const role = data.role === 'seeker' || data.role === 'giver' ? data.role : null;
    return {
      role,
    };
  } catch {
    return null;
  }
}

async function storeAccessVerification(details: {
  aleoAddress: string;
  role: AccessRole;
  transactionId: string;
  transactionStatus: string;
  proofVerified: boolean;
  hasAccess: boolean;
  proofReference: string;
}): Promise<void> {
  if (!supabaseAdmin) return;
  if (!details.transactionId) return;

  try {
    await supabaseAdmin.from('access_payments').upsert(
      {
        aleo_address: details.aleoAddress,
        role: details.role,
        transaction_id: details.transactionId,
        transaction_status: details.transactionStatus,
        proof_verified: details.proofVerified,
        has_access: details.hasAccess,
        proof_reference: details.proofReference || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'aleo_address,role' }
    );
  } catch {
    // Best effort only: table may not exist yet on environments pending migration.
  }
}

export async function verifyAccessState(options: {
  aleoAddress: string;
  role: AccessRole;
  transactionId?: string;
}): Promise<AccessVerificationResult> {
  const aleoAddress = normalizeText(options.aleoAddress);
  const role = options.role;
  const roleConfig = ACCESS_ROLE_CONFIG[role];
  const accessProgramId = ALEO_CONFIG.programs.accessControl;

  let transactionId = normalizeText(options.transactionId);
  let paymentSource: PaymentSource = 'none';

  if (transactionId) {
    paymentSource = 'provided';
  } else {
    const cachedTransactionId = await getCachedTransactionId(aleoAddress, role);
    if (cachedTransactionId) {
      transactionId = cachedTransactionId;
      paymentSource = 'cache';
    }
  }

  let records: Array<Record<string, unknown>> = [];
  let recordsError = '';

  try {
    const fetchedRecords = await aleoService.getRecords(aleoAddress, accessProgramId);
    records = Array.isArray(fetchedRecords) ? (fetchedRecords as Array<Record<string, unknown>>) : [];
  } catch (error: any) {
    recordsError = error?.message || 'Failed to fetch access records';
  }

  const matchingRecords = hasAccessRecord(records, roleConfig.recordName);

  let transactionStatus = 'unknown';
  let transactionVerified = false;
  let transactionError = '';

  if (transactionId) {
    try {
      const transaction = await aleoService.getTransaction(transactionId);
      transactionStatus = normalizeTransactionStatus(transaction);
      transactionVerified = verifyAccessPaymentTransaction({
        transaction,
        expectedProgramId: accessProgramId,
        expectedFunctionName: roleConfig.functionName,
        aleoAddress,
      });
    } catch (error: any) {
      transactionError = error?.message || 'Failed to verify transaction';
    }
  }

  const hasRecordProof = matchingRecords.length > 0;
  const hasConfirmedTransaction = isConfirmedStatus(transactionStatus);
  const hasTransactionProof = transactionId
    ? !isFailedStatus(transactionStatus) && (transactionVerified || hasConfirmedTransaction)
    : false;

  if (transactionId && !transactionVerified && hasConfirmedTransaction && !transactionError) {
    transactionError = 'Transition metadata missing in explorer response; confirmed-status fallback applied.';
  }

  const hasAccess = hasRecordProof || hasTransactionProof;

  const source: 'record' | 'transaction' | 'none' = hasRecordProof
    ? 'record'
    : hasTransactionProof
      ? 'transaction'
      : 'none';

  const proofReference = buildProofReference({
    source,
    matchingRecords,
    transactionId,
  });

  await storeAccessVerification({
    aleoAddress,
    role,
    transactionId,
    transactionStatus,
    proofVerified: hasRecordProof || hasTransactionProof,
    hasAccess,
    proofReference,
  });

  return {
    aleoAddress,
    role,
    hasAccess,
    proofVerified: hasRecordProof || hasTransactionProof,
    source,
    proofReference,
    matchingRecordCount: matchingRecords.length,
    transaction: transactionId
      ? {
        id: transactionId,
        status: transactionStatus,
        verified: hasTransactionProof,
        source: paymentSource,
      }
      : null,
    warnings: {
      records: recordsError || undefined,
      transaction: transactionError || undefined,
    },
  };
}

export async function handleVerifyAccess(req: Request, res: Response) {
  try {
    const body = req.body || {};
    const aleoAddress = normalizeText(body.aleoAddress);
    const roleRaw = normalizeText(body.role);
    const providedTransactionId = normalizeText(body.transactionId);

    if (!aleoAddress || !roleRaw) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: aleoAddress, role',
      });
    }

    if (!['seeker', 'giver'].includes(roleRaw)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid role. Must be seeker or giver.',
      });
    }

    const role = roleRaw as AccessRole;

    const profileRole = await getProfileRoleState(aleoAddress);
    if (profileRole?.role && profileRole.role !== role) {
      return res.status(403).json({
        success: false,
        error: `Wallet role is locked as ${profileRole.role}. Access for ${role} is not permitted.`,
      });
    }

    const verification = await verifyAccessState({
      aleoAddress,
      role,
      transactionId: providedTransactionId,
    });

    return res.status(200).json({
      success: true,
      data: verification,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to verify access',
    });
  }
}
