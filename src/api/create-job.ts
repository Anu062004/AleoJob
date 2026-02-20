import { createClient } from '@supabase/supabase-js';
import type { Request, Response } from 'express';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, join } from 'path';
import {
  isSpendableEscrowRecordReference,
  normalizeEscrowRecordReference,
} from '../lib/escrow-record-reference';

type CreateJobBody = {
  jobId?: string;
  aleoAddress?: string;
  title?: string;
  description?: string;
  skills?: unknown;
  budgetMin?: number | string;
  budgetMax?: number | string;
  zkMembershipHash?: string;
  escrowAmount?: number | string;
  escrowTransactionId?: string;
  escrowRecordId?: string;
};

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

function normalizeAddress(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.trim().toLowerCase();
}

function parseBudget(value: unknown): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.floor(parsed);
}

function normalizeSkills(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((skill) => String(skill || '').trim()).filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((skill) => skill.trim())
      .filter(Boolean);
  }

  return [];
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    globalThis.setTimeout(resolve, ms);
  });
}

async function waitForTransaction(transactionId: string, attempts = 6, delayMs = 2000) {
  for (let index = 0; index < attempts; index += 1) {
    const transaction = await aleoService.getTransaction(transactionId);
    if (transaction) return transaction;

    if (index < attempts - 1) {
      await sleep(delayMs);
    }
  }
  return null;
}

function toAleoField(value: string): string {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    const charCode = value.charCodeAt(index);
    hash = ((hash << 5) - hash) + charCode;
    hash |= 0;
  }
  return `${Math.abs(hash)}field`;
}

function toMicrocredits(amount: number): number {
  return Math.floor(Math.max(amount, 0) * 1_000_000);
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
  const transitionLists = [tx?.execution?.transitions, tx?.transaction?.execution?.transitions, tx?.transitions].filter(Boolean);

  for (const transitions of transitionLists) {
    if (!Array.isArray(transitions)) continue;

    for (const transition of transitions) {
      const text = JSON.stringify(transition).toLowerCase();
      if (!text.includes('create_job_escrow') && !text.includes('create_escrow')) continue;

      const outputCandidates = [
        transition?.outputs,
        transition?.transition?.outputs,
        transition?.execution?.outputs,
        transition,
      ];

      for (const outputCandidate of outputCandidates) {
        const candidates = collectCandidateRecordStrings(outputCandidate, []);
        const recordId = pickEscrowRecordCandidate(candidates);
        if (recordId) return recordId;
      }
    }
  }

  const fallback = collectCandidateRecordStrings(transaction, []);
  return pickEscrowRecordCandidate(fallback);
}

function verifyCreateJobEscrowTransaction(options: {
  transaction: unknown;
  expectedProgramId: string;
  payerAddress: string;
  amount: number;
  jobId: string;
}): boolean {
  const { transaction, expectedProgramId, payerAddress, amount, jobId } = options;
  if (!transaction) return false;

  const txText = JSON.stringify(transaction).toLowerCase();
  if (!txText) return false;

  const amountCredits = Math.floor(amount);
  const amountMicrocredits = toMicrocredits(amountCredits);
  const amountCreditsString = `${amountCredits}u64`.toLowerCase();
  const amountMicrocreditsString = `${amountMicrocredits}u64`.toLowerCase();
  const jobField = toAleoField(jobId).toLowerCase();

  return (
    txText.includes(expectedProgramId.toLowerCase()) &&
    txText.includes('create_job_escrow') &&
    txText.includes(payerAddress.toLowerCase()) &&
    txText.includes(jobField) &&
    (
      txText.includes(amountMicrocreditsString) ||
      txText.includes(String(amountMicrocredits)) ||
      txText.includes(amountCreditsString) ||
      txText.includes(String(amountCredits))
    )
  );
}

export async function handleCreateJob(req: Request, res: Response) {
  try {
    await loadDependencies();

    if (!supabaseAdmin) {
      return res.status(500).json({
        success: false,
        message: 'Server configuration error: Database not configured.',
      });
    }

    const body = (req.body || {}) as CreateJobBody;
    const jobId = String(body.jobId || '').trim();
    const aleoAddress = normalizeAddress(body.aleoAddress || req.header('x-aleo-address'));
    const title = String(body.title || '').trim();
    const description = String(body.description || '').trim();
    const skills = normalizeSkills(body.skills);
    const budgetMin = parseBudget(body.budgetMin);
    const budgetMax = parseBudget(body.budgetMax);
    const escrowAmount = parseBudget(body.escrowAmount ?? body.budgetMax);
    const escrowTransactionId = String(body.escrowTransactionId || '').trim();
    const zkMembershipHash = String(body.zkMembershipHash || '').trim();

    if (!jobId || !aleoAddress || !title || !description || budgetMin === null || budgetMax === null || escrowAmount === null || !escrowTransactionId) {
      return res.status(400).json({
        success: false,
        message:
          'Missing required fields: jobId, aleoAddress, title, description, budgetMin, budgetMax, escrowAmount, escrowTransactionId.',
      });
    }

    if (budgetMin > budgetMax) {
      return res.status(400).json({
        success: false,
        message: 'Minimum budget cannot exceed maximum budget.',
      });
    }

    if (escrowAmount !== budgetMax) {
      return res.status(400).json({
        success: false,
        message: 'Escrow amount must match maximum budget.',
      });
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, role')
      .eq('aleo_address', aleoAddress)
      .maybeSingle();

    if (profileError) {
      return res.status(500).json({
        success: false,
        message: `Failed to resolve profile: ${profileError.message}`,
      });
    }

    if (!profile?.id) {
      return res.status(404).json({
        success: false,
        message: 'Wallet profile not found. Please register your role first.',
      });
    }

    if (profile.role !== 'giver') {
      return res.status(403).json({
        success: false,
        message: 'This wallet is not registered as a giver.',
      });
    }

    await supabaseAdmin
      .from('profiles')
      .update({
        role: 'giver',
        role_locked: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profile.id);

    const warnings: Record<string, string | undefined> = {};
    let resolvedEscrowRecordId = normalizeEscrowRecordReference(body.escrowRecordId);

    const escrowTransaction = await waitForTransaction(escrowTransactionId, 6, 2000);
    if (!escrowTransaction) {
      warnings.transactionVerification =
        'Escrow funding transaction is still indexing on Aleo. Job saved provisionally and will be reconciled.';
    } else {
      const txStatus = normalizeTransactionStatus(escrowTransaction);
      if (isFailedStatus(txStatus)) {
        return res.status(400).json({
          success: false,
          message: `Escrow funding transaction failed with status: ${txStatus}`,
        });
      }

      const verified = verifyCreateJobEscrowTransaction({
        transaction: escrowTransaction,
        expectedProgramId: ALEO_CONFIG.programs.escrow,
        payerAddress: aleoAddress,
        amount: escrowAmount,
        jobId,
      });

      if (!verified && isConfirmedStatus(txStatus)) {
        return res.status(400).json({
          success: false,
          message: `Escrow transaction does not match ${ALEO_CONFIG.programs.escrow}/create_job_escrow`,
        });
      }

      if (!verified) {
        warnings.transactionVerification =
          'Escrow transaction metadata is still partial. Saved provisionally and will be reconciled automatically.';
      }

      if (!resolvedEscrowRecordId) {
        resolvedEscrowRecordId = extractEscrowRecordId(escrowTransaction);
      }
    }

    const { data: job, error: createJobError } = await supabaseAdmin
      .from('jobs')
      .insert({
        id: jobId,
        giver_id: profile.id,
        title,
        description,
        skills,
        budget: `${budgetMin}-${budgetMax} credits`,
        is_active: true,
        payment_status: 'locked',
        zk_membership_hash: zkMembershipHash || `proof:pending:${Date.now()}`,
      })
      .select('id, title, budget, payment_status, created_at')
      .single();

    if (createJobError) {
      return res.status(500).json({
        success: false,
        message: `Failed to post job: ${createJobError.message}`,
      });
    }

    const { data: escrow, error: createEscrowError } = await supabaseAdmin
      .from('escrows')
      .insert({
        job_id: jobId,
        employer_id: profile.id,
        freelancer_id: null,
        amount: escrowAmount,
        status: 'locked',
        escrow_record_id: resolvedEscrowRecordId || null,
        create_tx: escrowTransactionId,
      })
      .select('id, amount, status, create_tx, escrow_record_id')
      .single();

    if (createEscrowError) {
      await supabaseAdmin.from('jobs').delete().eq('id', jobId);

      const message = createEscrowError.message || 'Failed to persist escrow';
      if (message.toLowerCase().includes('freelancer_id')) {
        return res.status(500).json({
          success: false,
          message:
            'Escrow schema mismatch: escrows.freelancer_id must allow NULL for prefunded escrow. Run the latest escrow migration SQL first.',
        });
      }

      return res.status(500).json({
        success: false,
        message: `Failed to store prefunded escrow: ${message}`,
      });
    }

    return res.json({
      success: true,
      message: 'Job posted and escrow prefunded on-chain.',
      data: {
        job,
        escrow,
        warnings,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error?.message || 'Unexpected error while posting job.',
    });
  }
}
