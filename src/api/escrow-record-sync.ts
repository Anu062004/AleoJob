import { createClient } from '@supabase/supabase-js';
import type { Request, Response } from 'express';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, join } from 'path';
import {
  isSpendableEscrowRecordReference,
  normalizeEscrowRecordReference,
} from '../lib/escrow-record-reference';
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
let syncInProgress = false;

type EscrowRow = {
  id: string;
  create_tx: string | null;
  escrow_record_id: string | null;
  status: string;
};

type EscrowSyncOptions = {
  escrowIds?: string[];
  limit?: number;
  employerId?: string;
};

type ManualEscrowBinding = {
  escrowId: string;
  escrowRecordId?: string;
  createTx?: string;
};

export type EscrowSyncSummary = {
  scanned: number;
  updated: number;
  unresolved: number;
  skipped: number;
  entries: Array<{
    escrowId: string;
    createTx: string | null;
    escrowRecordId?: string;
    status: 'updated' | 'unresolved' | 'skipped';
    reason?: string;
  }>;
};

function normalizeManualEscrowBindings(input: unknown): ManualEscrowBinding[] {
  if (!Array.isArray(input)) return [];

  const uniqueByEscrowId = new Map<string, ManualEscrowBinding>();
  for (const row of input) {
    if (!row || typeof row !== 'object') continue;

    const escrowId = String((row as any).escrowId || '').trim();
    const escrowRecordId = normalizeEscrowRecordReference((row as any).escrowRecordId);
    const createTxRaw = String((row as any).createTx || '').trim();
    const createTx = createTxRaw.startsWith('at1') ? createTxRaw : '';

    if (!escrowId || (!escrowRecordId && !createTx)) continue;
    uniqueByEscrowId.set(escrowId, {
      escrowId,
      escrowRecordId: escrowRecordId || undefined,
      createTx: createTx || undefined,
    });
  }

  return Array.from(uniqueByEscrowId.values());
}

async function applyManualEscrowBindings(bindings: ManualEscrowBinding[]) {
  if (!supabaseAdmin || !bindings.length) {
    return {
      updated: 0,
      unresolved: 0,
      entries: [] as EscrowSyncSummary['entries'],
    };
  }

  let updated = 0;
  let unresolved = 0;
  const entries: EscrowSyncSummary['entries'] = [];

  for (const binding of bindings) {
    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (binding.escrowRecordId) {
      patch.escrow_record_id = binding.escrowRecordId;
    }

    // Keep create_tx normalized when caller was able to resolve an on-chain tx id.
    if (binding.createTx && binding.createTx.startsWith('at1')) {
      patch.create_tx = binding.createTx;
    }

    const { error } = await supabaseAdmin
      .from('escrows')
      .update(patch)
      .eq('id', binding.escrowId)
      .eq('status', 'locked');

    if (error) {
      unresolved += 1;
      entries.push({
        escrowId: binding.escrowId,
        createTx: binding.createTx || null,
        status: 'unresolved',
        reason: `Failed to persist manual escrow binding: ${error.message}`,
      });
      continue;
    }

    updated += 1;
    entries.push({
      escrowId: binding.escrowId,
      createTx: binding.createTx || null,
      escrowRecordId: binding.escrowRecordId,
      status: 'updated',
      reason: binding.escrowRecordId
        ? 'Escrow record bound from wallet recovery'
        : 'Escrow create_tx normalized from wallet recovery',
    });
  }

  return {
    updated,
    unresolved,
    entries,
  };
}

async function loadDependencies() {
  if (!aleoService) {
    const aleoServicePath = pathToFileURL(join(rootDir, 'lib', 'aleo-service.ts')).href;
    const aleoServiceModule = await import(aleoServicePath);
    aleoService = aleoServiceModule.aleoService;
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

function looksLikeRecordReference(value: string): boolean {
  const normalized = value.trim();
  if (!normalized) return false;
  return Boolean(normalizeEscrowRecordReference(normalized));
}

function collectCandidateRecordStrings(input: unknown, collector: string[] = []): string[] {
  if (!input) return collector;

  if (typeof input === 'string') {
    if (looksLikeRecordReference(input)) {
      collector.push(input.trim());
    }
    return collector;
  }

  if (Array.isArray(input)) {
    for (const item of input) {
      collectCandidateRecordStrings(item, collector);
    }
    return collector;
  }

  if (typeof input === 'object') {
    const objectValue = input as Record<string, unknown>;
    if (isSpendableEscrowRecordReference(objectValue)) {
      const serialized = normalizeEscrowRecordReference(objectValue);
      if (serialized) {
        collector.push(serialized);
      }
    }

    const keys = Object.keys(objectValue).map((key) => key.toLowerCase());
    const looksLikeEscrowObject =
      keys.includes('job_id') &&
      keys.includes('amount') &&
      keys.includes('status') &&
      (keys.includes('payer') || keys.includes('payee') || keys.includes('owner'));

    if (looksLikeEscrowObject) {
      collector.push(JSON.stringify(objectValue));
    }

    for (const [key, value] of Object.entries(objectValue)) {
      if (typeof value === 'string') {
        const lowerKey = key.toLowerCase();
        if (
          lowerKey.includes('record') ||
          lowerKey.includes('commitment') ||
          lowerKey === 'id' ||
          lowerKey === 'value' ||
          lowerKey.includes('cipher') ||
          lowerKey.includes('owner') ||
          lowerKey.includes('payer') ||
          lowerKey.includes('payee') ||
          lowerKey.includes('amount') ||
          lowerKey.includes('job_id') ||
          lowerKey.includes('status') ||
          lowerKey.includes('nonce')
        ) {
          if (looksLikeRecordReference(value)) {
            collector.push(value.trim());
          }
        }
      } else {
        collectCandidateRecordStrings(value, collector);
      }
    }
  }

  return collector;
}

function pickEscrowRecordCandidate(candidates: string[]): string {
  if (!candidates.length) return '';

  const normalizedCandidates = candidates
    .map((candidate) => String(candidate || '').trim())
    .filter(Boolean);
  if (!normalizedCandidates.length) return '';

  for (const candidate of normalizedCandidates) {
    if (isSpendableEscrowRecordReference(candidate)) {
      const rich = normalizeEscrowRecordReference(candidate);
      if (rich) {
        return rich;
      }
    }
  }

  for (const candidate of normalizedCandidates) {
    const normalized = normalizeEscrowRecordReference(candidate);
    if (normalized) {
      return normalized;
    }
  }

  return '';
}

function extractEscrowRecordId(transaction: unknown): string {
  const tx = transaction as any;

  const transitionLists = [
    tx?.execution?.transitions,
    tx?.transaction?.execution?.transitions,
    tx?.transitions,
  ].filter(Boolean);

  for (const transitions of transitionLists) {
    if (!Array.isArray(transitions)) continue;

    for (const transition of transitions) {
      const text = JSON.stringify(transition).toLowerCase();
      if (!text.includes('create_escrow') && !text.includes('create_job_escrow')) continue;

      const outputCandidates = [
        transition?.outputs,
        transition?.transition?.outputs,
        transition?.execution?.outputs,
        transition,
      ];

      for (const outputCandidate of outputCandidates) {
        const candidates = collectCandidateRecordStrings(outputCandidate, []);
        const recordId = pickEscrowRecordCandidate(candidates);
        if (recordId) {
          return recordId;
        }
      }
    }
  }

  const fallback = collectCandidateRecordStrings(transaction, []);
  return pickEscrowRecordCandidate(fallback);
}

async function listPendingEscrows(options: EscrowSyncOptions): Promise<EscrowRow[]> {
  if (!supabaseAdmin) {
    throw new Error('Server configuration error: Database not configured');
  }

  const limit = Math.min(Math.max(Number(options.limit || 20), 1), 200);
  const normalizedIds = Array.isArray(options.escrowIds)
    ? options.escrowIds.map((id) => String(id).trim()).filter(Boolean)
    : [];

  let query = supabaseAdmin
    .from('escrows')
    .select('id, create_tx, escrow_record_id, status')
    .not('create_tx', 'is', null)
    .eq('status', 'locked')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (normalizedIds.length > 0) {
    query = query.in('id', normalizedIds);
  }

  if (options.employerId) {
    query = query.eq('employer_id', options.employerId);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to query escrows for sync: ${error.message}`);
  }

  const rows = (data || []) as EscrowRow[];
  return rows.filter((row) => !isSpendableEscrowRecordReference(row.escrow_record_id));
}

async function persistEscrowRecordId(escrowId: string, escrowRecordId: string) {
  if (!supabaseAdmin) {
    throw new Error('Server configuration error: Database not configured');
  }

  const { error } = await supabaseAdmin
    .from('escrows')
    .update({
      escrow_record_id: escrowRecordId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', escrowId);

  if (error) {
    throw new Error(`Failed updating escrow ${escrowId}: ${error.message}`);
  }
}

export async function runEscrowRecordSync(options: EscrowSyncOptions = {}): Promise<EscrowSyncSummary> {
  if (syncInProgress) {
    return {
      scanned: 0,
      updated: 0,
      unresolved: 0,
      skipped: 1,
      entries: [
        {
          escrowId: 'sync',
          createTx: null,
          status: 'skipped',
          reason: 'Sync already running',
        },
      ],
    };
  }

  syncInProgress = true;
  try {
    await loadDependencies();

    const pendingEscrows = await listPendingEscrows(options);
    const summary: EscrowSyncSummary = {
      scanned: pendingEscrows.length,
      updated: 0,
      unresolved: 0,
      skipped: 0,
      entries: [],
    };

    for (const escrow of pendingEscrows) {
      const createTx = escrow.create_tx;
      if (!createTx) {
        summary.skipped += 1;
        summary.entries.push({
          escrowId: escrow.id,
          createTx: null,
          status: 'skipped',
          reason: 'Missing create_tx',
        });
        continue;
      }

      const transaction = await aleoService.getTransaction(createTx);
      if (!transaction) {
        summary.unresolved += 1;
        summary.entries.push({
          escrowId: escrow.id,
          createTx,
          status: 'unresolved',
          reason: 'Transaction not available from Aleo RPC',
        });
        continue;
      }

      const txStatus = normalizeTransactionStatus(transaction);
      if (isFailedStatus(txStatus)) {
        summary.unresolved += 1;
        summary.entries.push({
          escrowId: escrow.id,
          createTx,
          status: 'unresolved',
          reason: `Create transaction failed with status: ${txStatus}`,
        });
        continue;
      }

      const escrowRecordId = extractEscrowRecordId(transaction);
      if (!escrowRecordId) {
        summary.unresolved += 1;
        summary.entries.push({
          escrowId: escrow.id,
          createTx,
          status: 'unresolved',
          reason: 'Escrow record reference not yet found in transaction payload',
        });
        continue;
      }

      await persistEscrowRecordId(escrow.id, escrowRecordId);
      summary.updated += 1;
      summary.entries.push({
        escrowId: escrow.id,
        createTx,
        escrowRecordId,
        status: 'updated',
      });
    }

    return summary;
  } finally {
    syncInProgress = false;
  }
}

export async function handleSyncEscrowRecords(req: Request, res: Response) {
  try {
    const body = req.body || {};
    const requesterAddress = getRequesterAleoAddress(req);
    const escrowIds = normalizeEscrowIds(body.escrowIds);
    const manualBindings = normalizeManualEscrowBindings(body.manualRecords);
    const manualEscrowIds = manualBindings.map((row) => row.escrowId);
    const limit = body.limit;
    const opsAllowlistConfigured = hasOpsAdminAllowlist();
    const isAdmin = requesterAddress ? isOpsAdminAddress(requesterAddress) : false;

    if (!requesterAddress) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: aleoAddress',
      });
    }

    const requestedEscrowIds = Array.from(new Set([...escrowIds, ...manualEscrowIds]));
    let scopedEscrowIds = requestedEscrowIds.length > 0 ? requestedEscrowIds : undefined;
    let employerId: string | undefined;

    if (!isAdmin) {
      if (!requestedEscrowIds.length) {
        return res.status(403).json({
          success: false,
          error: opsAllowlistConfigured
            ? 'Only ops admin wallets can run global escrow sync. Non-admin requests must include escrowIds.'
            : 'OPS_ADMIN_ADDRESSES is not configured. Provide escrowIds to run owner-scoped sync.',
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
        requestedEscrowIds,
        employerProfileId
      );

      if (ownedEscrowIds.length !== requestedEscrowIds.length) {
        return res.status(403).json({
          success: false,
          error: 'One or more escrowIds are not owned by this wallet address',
        });
      }

      scopedEscrowIds = ownedEscrowIds;
      employerId = employerProfileId;
    }

    let scopedManualBindings = manualBindings;
    if (scopedEscrowIds) {
      const allowedIds = new Set(scopedEscrowIds);
      scopedManualBindings = manualBindings.filter((row) => allowedIds.has(row.escrowId));
    }

    const manualResult = await applyManualEscrowBindings(scopedManualBindings);

    const summary = await runEscrowRecordSync({
      escrowIds: scopedEscrowIds,
      limit,
      employerId,
    });

    summary.updated += manualResult.updated;
    summary.unresolved += manualResult.unresolved;
    summary.entries = [...manualResult.entries, ...summary.entries];

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
      error: error?.message || 'Failed to sync escrow records',
    });
  }
}
