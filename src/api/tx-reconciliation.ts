import { createClient } from '@supabase/supabase-js';
import type { Request, Response } from 'express';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, join } from 'path';
import {
  filterEscrowIdsOwnedByProfile,
  findProfileIdByAleoAddress,
  getRequesterAleoAddress,
  hasOpsAdminAllowlist,
  isOpsAdminAddress,
  normalizeEscrowIds,
} from './ops-auth';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..', '..');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabaseAdmin =
  supabaseUrl && serviceRoleKey
    ? createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    : null;

let aleoService: any = null;
let ALEO_CONFIG: any = null;
let reconciliationInProgress = false;

type EscrowStatus = 'locked' | 'released' | 'refunded';

type EscrowRow = {
  id: string;
  job_id: string;
  employer_id: string;
  freelancer_id: string | null;
  status: EscrowStatus;
  create_tx: string | null;
  release_tx: string | null;
  refund_tx: string | null;
};

type AccessPaymentRow = {
  id: string;
  transaction_id: string;
  transaction_status: string | null;
  proof_verified: boolean | null;
  has_access: boolean | null;
};

type TransactionState = 'confirmed' | 'failed' | 'pending' | 'unknown';

type TransactionInspection = {
  state: TransactionState;
  status: string;
  verified: boolean;
  transaction: unknown | null;
};

export type ReconciliationSummary = {
  scannedEscrows: number;
  updatedEscrows: number;
  revertedEscrows: number;
  scannedAccessPayments: number;
  updatedAccessPayments: number;
  unresolved: number;
  skipped: number;
  entries: Array<{
    type: 'escrow' | 'access_payment' | 'reconciliation';
    id: string;
    status: 'updated' | 'reverted' | 'unresolved' | 'skipped';
    reason?: string;
  }>;
};

type ReconciliationOptions = {
  escrowIds?: string[];
  limit?: number;
  includeAccessPayments?: boolean;
  employerId?: string;
};

async function loadDependencies() {
  if (!aleoService) {
    const aleoServicePath = pathToFileURL(join(rootDir, 'lib', 'aleo-service.ts')).href;
    const aleoServiceModule = await import(aleoServicePath);
    aleoService = aleoServiceModule.aleoService;
  }

  if (!ALEO_CONFIG) {
    const configPath = pathToFileURL(join(rootDir, 'lib', 'aleo-config.ts')).href;
    const configModule = await import(configPath);
    ALEO_CONFIG = configModule.ALEO_CONFIG;
  }
}

function normalizeTransactionStatus(transaction: any): string {
  const candidates = [
    transaction?.status,
    transaction?.transaction?.status,
    transaction?.finalize_status,
    transaction?.execution?.status,
    transaction?.state,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim().toLowerCase();
    }
  }

  return 'unknown';
}

function isFailedStatus(status: string): boolean {
  return ['failed', 'failure', 'rejected', 'aborted', 'error', 'invalid'].includes(status);
}

function isConfirmedStatus(status: string): boolean {
  return ['confirmed', 'accepted', 'finalized', 'completed', 'success', 'included', 'settled'].includes(status);
}

function verifyEscrowTransition(
  transaction: unknown,
  transitionName: 'create_job_escrow' | 'create_escrow' | 'release_payment' | 'refund_payment'
): boolean {
  if (!transaction) return false;
  const text = JSON.stringify(transaction).toLowerCase();
  if (!text) return false;
  return text.includes(ALEO_CONFIG.programs.escrow.toLowerCase()) && text.includes(transitionName);
}

async function inspectTransaction(
  transactionId: string | null,
  expectedTransition?: 'create_job_escrow' | 'create_escrow' | 'release_payment' | 'refund_payment'
): Promise<TransactionInspection> {
  if (!transactionId) {
    return { state: 'unknown', status: 'unknown', verified: false, transaction: null };
  }

  const transaction = await aleoService.getTransaction(transactionId);
  if (!transaction) {
    return { state: 'unknown', status: 'unknown', verified: false, transaction: null };
  }

  const status = normalizeTransactionStatus(transaction);
  const state: TransactionState = isFailedStatus(status)
    ? 'failed'
    : isConfirmedStatus(status)
      ? 'confirmed'
      : status === 'unknown'
        ? 'unknown'
        : 'pending';

  const verified = expectedTransition
    ? verifyEscrowTransition(transaction, expectedTransition)
    : true;

  return {
    state,
    status,
    verified,
    transaction,
  };
}

function verifyAnyCreateEscrowTransition(transaction: unknown): boolean {
  return (
    verifyEscrowTransition(transaction, 'create_job_escrow') ||
    verifyEscrowTransition(transaction, 'create_escrow')
  );
}

async function listEscrowsForReconciliation(options: ReconciliationOptions): Promise<EscrowRow[]> {
  if (!supabaseAdmin) {
    throw new Error('Server configuration error: Database not configured');
  }

  const limit = Math.min(Math.max(Number(options.limit || 40), 1), 300);
  const normalizedIds = Array.isArray(options.escrowIds)
    ? options.escrowIds.map((id) => String(id).trim()).filter(Boolean)
    : [];

  let query = supabaseAdmin
    .from('escrows')
    .select('id, job_id, employer_id, freelancer_id, status, create_tx, release_tx, refund_tx')
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (normalizedIds.length > 0) {
    query = query.in('id', normalizedIds);
  }

  if (options.employerId) {
    query = query.eq('employer_id', options.employerId);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed querying escrows for reconciliation: ${error.message}`);
  }

  return (data || []) as EscrowRow[];
}

async function listAccessPaymentsForReconciliation(limit: number): Promise<AccessPaymentRow[]> {
  if (!supabaseAdmin) {
    throw new Error('Server configuration error: Database not configured');
  }

  const { data, error } = await supabaseAdmin
    .from('access_payments')
    .select('id, transaction_id, transaction_status, proof_verified, has_access')
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed querying access payments for reconciliation: ${error.message}`);
  }

  return (data || []) as AccessPaymentRow[];
}

async function applyEscrowState(
  escrow: EscrowRow,
  nextEscrowPatch: Partial<EscrowRow>,
  nextPaymentStatus: 'pending' | 'locked' | 'completed' | 'refunded'
) {
  if (!supabaseAdmin) {
    throw new Error('Server configuration error: Database not configured');
  }

  const { error: escrowError } = await supabaseAdmin
    .from('escrows')
    .update({
      ...nextEscrowPatch,
      updated_at: new Date().toISOString(),
    })
    .eq('id', escrow.id);

  if (escrowError) {
    throw new Error(`Failed updating escrow ${escrow.id}: ${escrowError.message}`);
  }

  const { error: jobError } = await supabaseAdmin
    .from('jobs')
    .update({ payment_status: nextPaymentStatus })
    .eq('id', escrow.job_id);

  if (jobError) {
    console.error('[Tx Reconcile] Failed updating job payment status:', jobError);
  }
}

async function rollbackFailedCreateEscrow(escrow: EscrowRow) {
  if (!supabaseAdmin) {
    throw new Error('Server configuration error: Database not configured');
  }

  if (escrow.freelancer_id) {
    await supabaseAdmin
      .from('applications')
      .update({ status: 'pending' })
      .eq('job_id', escrow.job_id)
      .eq('seeker_id', escrow.freelancer_id)
      .eq('status', 'accepted');
  }

  await supabaseAdmin
    .from('jobs')
    .update({ payment_status: 'pending' })
    .eq('id', escrow.job_id);

  const { error: deleteError } = await supabaseAdmin
    .from('escrows')
    .delete()
    .eq('id', escrow.id);

  if (deleteError) {
    throw new Error(`Failed deleting failed escrow ${escrow.id}: ${deleteError.message}`);
  }
}

async function ensureAcceptedApplicationForLockedEscrow(escrow: EscrowRow) {
  if (!supabaseAdmin) {
    throw new Error('Server configuration error: Database not configured');
  }

  if (!escrow.freelancer_id) {
    await supabaseAdmin
      .from('jobs')
      .update({ payment_status: 'locked' })
      .eq('id', escrow.job_id);
    return;
  }

  await supabaseAdmin
    .from('applications')
    .update({ status: 'accepted' })
    .eq('job_id', escrow.job_id)
    .eq('seeker_id', escrow.freelancer_id)
    .eq('status', 'pending');

  await supabaseAdmin
    .from('jobs')
    .update({ payment_status: 'locked' })
    .eq('id', escrow.job_id);
}

export async function runTransactionReconciliation(
  options: ReconciliationOptions = {}
): Promise<ReconciliationSummary> {
  if (reconciliationInProgress) {
    return {
      scannedEscrows: 0,
      updatedEscrows: 0,
      revertedEscrows: 0,
      scannedAccessPayments: 0,
      updatedAccessPayments: 0,
      unresolved: 0,
      skipped: 1,
      entries: [
        {
          type: 'reconciliation',
          id: 'in-progress',
          status: 'skipped',
          reason: 'Reconciliation already running',
        },
      ],
    };
  }

  reconciliationInProgress = true;
  try {
    await loadDependencies();

    if (!supabaseAdmin) {
      throw new Error('Server configuration error: Database not configured');
    }

    const summary: ReconciliationSummary = {
      scannedEscrows: 0,
      updatedEscrows: 0,
      revertedEscrows: 0,
      scannedAccessPayments: 0,
      updatedAccessPayments: 0,
      unresolved: 0,
      skipped: 0,
      entries: [],
    };

    const limit = Math.min(Math.max(Number(options.limit || 40), 1), 300);
    const escrows = await listEscrowsForReconciliation(options);
    summary.scannedEscrows = escrows.length;

    for (const escrow of escrows) {
      const createInspection = await inspectTransaction(escrow.create_tx);
      const createVerified = createInspection.transaction
        ? verifyAnyCreateEscrowTransition(createInspection.transaction)
        : false;
      const releaseInspection = await inspectTransaction(escrow.release_tx, 'release_payment');
      const refundInspection = await inspectTransaction(escrow.refund_tx, 'refund_payment');

      if (escrow.release_tx) {
        if (releaseInspection.state === 'confirmed' && releaseInspection.verified) {
          if (escrow.status !== 'released') {
            await applyEscrowState(escrow, { status: 'released' }, 'completed');
            summary.updatedEscrows += 1;
            summary.entries.push({
              type: 'escrow',
              id: escrow.id,
              status: 'updated',
              reason: 'Release transaction confirmed',
            });
          } else {
            summary.skipped += 1;
          }
        } else if (
          releaseInspection.state === 'failed' ||
          (releaseInspection.state === 'confirmed' && !releaseInspection.verified)
        ) {
          await applyEscrowState(escrow, { status: 'locked', release_tx: null }, 'locked');
          summary.revertedEscrows += 1;
          summary.entries.push({
            type: 'escrow',
            id: escrow.id,
            status: 'reverted',
            reason: 'Release transaction failed or invalid for escrow transition',
          });
        } else {
          summary.unresolved += 1;
        }
        continue;
      }

      if (escrow.refund_tx) {
        if (refundInspection.state === 'confirmed' && refundInspection.verified) {
          if (escrow.status !== 'refunded') {
            await applyEscrowState(escrow, { status: 'refunded' }, 'refunded');
            summary.updatedEscrows += 1;
            summary.entries.push({
              type: 'escrow',
              id: escrow.id,
              status: 'updated',
              reason: 'Refund transaction confirmed',
            });
          } else {
            summary.skipped += 1;
          }
        } else if (
          refundInspection.state === 'failed' ||
          (refundInspection.state === 'confirmed' && !refundInspection.verified)
        ) {
          await applyEscrowState(escrow, { status: 'locked', refund_tx: null }, 'locked');
          summary.revertedEscrows += 1;
          summary.entries.push({
            type: 'escrow',
            id: escrow.id,
            status: 'reverted',
            reason: 'Refund transaction failed or invalid for escrow transition',
          });
        } else {
          summary.unresolved += 1;
        }
        continue;
      }

      if (!escrow.create_tx) {
        summary.skipped += 1;
        continue;
      }

      if (createInspection.state === 'confirmed' && createVerified) {
        if (escrow.status !== 'locked') {
          await applyEscrowState(escrow, { status: 'locked' }, 'locked');
          summary.updatedEscrows += 1;
          summary.entries.push({
            type: 'escrow',
            id: escrow.id,
            status: 'updated',
            reason: 'Create transaction confirmed; escrow normalized to locked',
          });
        } else {
          await ensureAcceptedApplicationForLockedEscrow(escrow);
          summary.skipped += 1;
        }
      } else if (
        createInspection.state === 'failed' ||
        (createInspection.state === 'confirmed' && !createVerified)
      ) {
        await rollbackFailedCreateEscrow(escrow);
        summary.revertedEscrows += 1;
        summary.entries.push({
          type: 'escrow',
          id: escrow.id,
          status: 'reverted',
          reason: 'Create transaction failed or invalid for escrow transition',
        });
      } else {
        summary.unresolved += 1;
      }
    }

    if (options.includeAccessPayments !== false) {
      try {
        const accessPayments = await listAccessPaymentsForReconciliation(limit);
        summary.scannedAccessPayments = accessPayments.length;

        for (const payment of accessPayments) {
          const inspection = await inspectTransaction(payment.transaction_id);
          const nextStatus = inspection.status;
          const nextProof = inspection.state === 'confirmed';
          const nextAccess = inspection.state === 'confirmed';

          const shouldUpdate =
            nextStatus !== (payment.transaction_status || '').toLowerCase() ||
            nextProof !== Boolean(payment.proof_verified) ||
            nextAccess !== Boolean(payment.has_access);

          if (!shouldUpdate) {
            summary.skipped += 1;
            continue;
          }

          const { error } = await supabaseAdmin
            .from('access_payments')
            .update({
              transaction_status: nextStatus,
              proof_verified: nextProof,
              has_access: nextAccess,
              updated_at: new Date().toISOString(),
            })
            .eq('id', payment.id);

          if (error) {
            summary.unresolved += 1;
            summary.entries.push({
              type: 'access_payment',
              id: payment.id,
              status: 'unresolved',
              reason: error.message,
            });
            continue;
          }

          summary.updatedAccessPayments += 1;
          summary.entries.push({
            type: 'access_payment',
            id: payment.id,
            status: 'updated',
            reason: `transaction_status=${nextStatus}`,
          });
        }
      } catch (error: any) {
        summary.unresolved += 1;
        summary.entries.push({
          type: 'access_payment',
          id: 'all',
          status: 'unresolved',
          reason: error?.message || 'Failed reconciling access payments',
        });
      }
    }

    return summary;
  } finally {
    reconciliationInProgress = false;
  }
}

export async function handleReconcileTransactions(req: Request, res: Response) {
  try {
    const body = req.body || {};
    const requesterAddress = getRequesterAleoAddress(req);
    const escrowIds = normalizeEscrowIds(body.escrowIds);
    const limit = body.limit;
    const includeAccessPayments = body.includeAccessPayments;
    const opsAllowlistConfigured = hasOpsAdminAllowlist();
    const isAdmin = requesterAddress ? isOpsAdminAddress(requesterAddress) : false;

    if (!requesterAddress) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: aleoAddress',
      });
    }

    let scopedEscrowIds = escrowIds.length > 0 ? escrowIds : undefined;
    let scopedEmployerId: string | undefined;
    let scopedAccessPayments = includeAccessPayments;

    if (!isAdmin) {
      if (includeAccessPayments === true) {
        return res.status(403).json({
          success: false,
          error: 'Only ops admin wallets can reconcile access payments',
        });
      }

      if (!escrowIds.length) {
        return res.status(403).json({
          success: false,
          error: opsAllowlistConfigured
            ? 'Only ops admin wallets can run global reconciliation. Non-admin requests must include escrowIds.'
            : 'OPS_ADMIN_ADDRESSES is not configured. Provide escrowIds to run owner-scoped reconciliation.',
        });
      }

      if (!supabaseAdmin) {
        throw new Error('Server configuration error: Database not configured');
      }

      const employerProfileId = await findProfileIdByAleoAddress(supabaseAdmin, requesterAddress);
      if (!employerProfileId) {
        return res.status(404).json({
          success: false,
          error: 'Requester profile not found for aleoAddress',
        });
      }

      const ownedEscrowIds = await filterEscrowIdsOwnedByProfile(
        supabaseAdmin,
        escrowIds,
        employerProfileId
      );

      if (ownedEscrowIds.length !== escrowIds.length) {
        return res.status(403).json({
          success: false,
          error: 'One or more escrowIds are not owned by this wallet address',
        });
      }

      scopedEscrowIds = ownedEscrowIds;
      scopedEmployerId = employerProfileId;
      scopedAccessPayments = false;
    }

    const summary = await runTransactionReconciliation({
      escrowIds: scopedEscrowIds,
      limit,
      includeAccessPayments: scopedAccessPayments,
      employerId: scopedEmployerId,
    });

    return res.status(200).json({
      success: true,
      data: summary,
      meta: {
        requesterAddress,
        admin: isAdmin,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to reconcile transactions',
    });
  }
}
