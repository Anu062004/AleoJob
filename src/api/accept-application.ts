import { createClient } from '@supabase/supabase-js';
import type { Request, Response } from 'express';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, join } from 'path';
import {
  isSpendableEscrowRecordReference,
  normalizeEscrowRecordReference,
} from '../lib/escrow-record-reference';

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
    if (transaction) {
      return transaction;
    }

    if (index < attempts - 1) {
      await sleep(delayMs);
    }
  }

  return null;
}

function parseEscrowAmount(amount: unknown, budget: unknown): number {
  const numericAmount = Number(amount);
  if (Number.isFinite(numericAmount) && numericAmount > 0) {
    return Math.floor(numericAmount);
  }

  if (typeof budget === 'string') {
    const numbers = budget.match(/\d+/g);
    if (numbers && numbers.length > 0) {
      if (numbers.length === 1) {
        return Number(numbers[0]);
      }
      return Math.floor(Number(numbers[numbers.length - 1]));
    }
  }

  return 0;
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

  const transitionLists = [
    tx?.execution?.transitions,
    tx?.transaction?.execution?.transitions,
    tx?.transitions,
  ].filter(Boolean);

  for (const transitions of transitionLists) {
    if (!Array.isArray(transitions)) continue;

    for (const transition of transitions) {
      const text = JSON.stringify(transition).toLowerCase();
      if (!text.includes('create_escrow')) continue;

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

function verifyEscrowCreateTransaction(options: {
  transaction: unknown;
  expectedProgramId: string;
  payerAddress: string;
  payeeAddress: string;
  amount: number;
}): boolean {
  const { transaction, expectedProgramId, payerAddress, payeeAddress, amount } = options;

  if (!transaction) return false;

  const txText = JSON.stringify(transaction).toLowerCase();
  if (!txText) return false;

  const amountCredits = Math.floor(amount);
  const amountMicrocredits = toMicrocredits(amountCredits);
  const amountCreditsString = `${amountCredits}u64`.toLowerCase();
  const amountMicrocreditsString = `${amountMicrocredits}u64`.toLowerCase();

  return (
    txText.includes(expectedProgramId.toLowerCase()) &&
    txText.includes('create_escrow') &&
    txText.includes(payerAddress.toLowerCase()) &&
    txText.includes(payeeAddress.toLowerCase()) &&
    (
      txText.includes(amountMicrocreditsString) ||
      txText.includes(String(amountMicrocredits)) ||
      txText.includes(amountCreditsString) ||
      txText.includes(String(amountCredits))
    )
  );
}

async function updateApplicationAndCreateEscrow(options: {
  applicationId: string;
  jobId: string;
  employerId: string;
  freelancerId: string;
  amount: number;
  transactionId: string;
  escrowRecordId: string;
}) {
  if (!supabaseAdmin) {
    throw new Error('Server configuration error: Database not configured');
  }

  const { error: updateAppError } = await supabaseAdmin
    .from('applications')
    .update({ status: 'accepted' })
    .eq('id', options.applicationId);

  if (updateAppError) {
    throw new Error('Failed to update application status');
  }

  const { data: escrow, error: escrowError } = await supabaseAdmin
    .from('escrows')
    .insert({
      job_id: options.jobId,
      employer_id: options.employerId,
      freelancer_id: options.freelancerId,
      amount: options.amount,
      status: 'locked',
      escrow_record_id: options.escrowRecordId || null,
      create_tx: options.transactionId,
    })
    .select()
    .single();

  if (escrowError) {
    await supabaseAdmin.from('applications').update({ status: 'pending' }).eq('id', options.applicationId);
    throw new Error(`Failed to store escrow: ${escrowError.message}`);
  }

  await supabaseAdmin.from('jobs').update({ payment_status: 'locked' }).eq('id', options.jobId);

  return escrow;
}

async function updateApplicationAndAssignPrefundedEscrow(options: {
  applicationId: string;
  jobId: string;
  employerId: string;
  freelancerId: string;
}) {
  if (!supabaseAdmin) {
    throw new Error('Server configuration error: Database not configured');
  }

  const { data: existingEscrow, error: existingEscrowError } = await supabaseAdmin
    .from('escrows')
    .select('id, job_id, employer_id, freelancer_id, amount, status, create_tx, escrow_record_id, release_tx, refund_tx')
    .eq('job_id', options.jobId)
    .maybeSingle();

  if (existingEscrowError) {
    throw new Error(`Failed to inspect existing escrow: ${existingEscrowError.message}`);
  }

  if (!existingEscrow) {
    throw new Error('Prefunded escrow not found for this job');
  }

  if (existingEscrow.employer_id !== options.employerId) {
    throw new Error('You do not own this prefunded escrow');
  }

  if (existingEscrow.status !== 'locked') {
    throw new Error(`Escrow already processed. Current status: ${existingEscrow.status}`);
  }

  if (existingEscrow.freelancer_id && existingEscrow.freelancer_id !== options.freelancerId) {
    throw new Error('Escrow is already assigned to another seeker');
  }

  const { error: updateAppError } = await supabaseAdmin
    .from('applications')
    .update({ status: 'accepted' })
    .eq('id', options.applicationId);

  if (updateAppError) {
    throw new Error('Failed to update application status');
  }

  let escrow = existingEscrow as any;
  if (!existingEscrow.freelancer_id) {
    const { data: updatedEscrow, error: assignEscrowError } = await supabaseAdmin
      .from('escrows')
      .update({
        freelancer_id: options.freelancerId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingEscrow.id)
      .select('id, job_id, employer_id, freelancer_id, amount, status, create_tx, escrow_record_id, release_tx, refund_tx')
      .single();

    if (assignEscrowError) {
      await supabaseAdmin.from('applications').update({ status: 'pending' }).eq('id', options.applicationId);
      throw new Error(`Failed to assign prefunded escrow to accepted seeker: ${assignEscrowError.message}`);
    }

    escrow = updatedEscrow;
  }

  await supabaseAdmin.from('jobs').update({ payment_status: 'locked' }).eq('id', options.jobId);

  return escrow;
}

export async function handleAcceptApplication(req: Request, res: Response) {
  try {
    await loadDependencies();

    if (!supabaseAdmin) {
      return res.status(500).json({
        success: false,
        message: 'Server configuration error: Database not configured.',
      });
    }

    const {
      applicationId,
      employerPrivateKey,
      aleoAddress,
      amount,
      escrowTransactionId,
      escrowRecordId,
    } = req.body || {};
    const providedEscrowRecordId = normalizeEscrowRecordReference(escrowRecordId);

    if (!applicationId || !aleoAddress) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: applicationId, aleoAddress',
      });
    }

    const { data: user, error: userError } = await supabaseAdmin
      .from('profiles')
      .select('id, aleo_address, role')
      .eq('aleo_address', aleoAddress)
      .single();

    if (userError || !user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.role !== 'giver') {
      return res.status(403).json({
        success: false,
        message: 'This wallet is not registered as a job giver.',
      });
    }

    const { data: application, error: applicationError } = await supabaseAdmin
      .from('applications')
      .select(`
        id, job_id, seeker_id, status,
        jobs!inner (id, giver_id, title, budget, payment_status)
      `)
      .eq('id', applicationId)
      .single();

    if (applicationError || !application) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    const job = (application as any).jobs;

    if (job.giver_id !== user.id) {
      return res.status(403).json({ success: false, message: 'You do not own this job' });
    }

    if (application.status === 'accepted') {
      return res.status(400).json({ success: false, message: 'Application has already been accepted' });
    }

    if (job.payment_status === 'completed' || job.payment_status === 'refunded') {
      return res.status(400).json({ success: false, message: `Job payment already ${job.payment_status}` });
    }

    const { data: freelancer, error: freelancerError } = await supabaseAdmin
      .from('profiles')
      .select('id, aleo_address')
      .eq('id', application.seeker_id)
      .single();

    if (freelancerError || !freelancer) {
      return res.status(404).json({ success: false, message: 'Freelancer not found' });
    }

    if (!freelancer.aleo_address) {
      return res.status(400).json({ success: false, message: 'Freelancer does not have an Aleo address' });
    }

    const { data: existingEscrow, error: existingEscrowError } = await supabaseAdmin
      .from('escrows')
      .select('id, job_id, employer_id, freelancer_id, amount, status, create_tx, escrow_record_id')
      .eq('job_id', job.id)
      .maybeSingle();

    if (existingEscrowError) {
      return res.status(500).json({
        success: false,
        message: `Failed to inspect existing escrow: ${existingEscrowError.message}`,
      });
    }

    // Preferred flow: escrow is prefunded at job posting, so acceptance only binds the seeker.
    if (existingEscrow) {
      if (existingEscrow.status !== 'locked') {
        return res.status(400).json({
          success: false,
          message: `Job escrow is already ${existingEscrow.status}`,
        });
      }

      if (existingEscrow.freelancer_id && existingEscrow.freelancer_id !== freelancer.id) {
        return res.status(400).json({
          success: false,
          message: 'Job escrow is already assigned to another seeker',
        });
      }

      const escrow = await updateApplicationAndAssignPrefundedEscrow({
        applicationId,
        jobId: job.id,
        employerId: user.id,
        freelancerId: freelancer.id,
      });

      return res.status(200).json({
        success: true,
        message: 'Application accepted and prefunded escrow assigned',
        data: {
          mode: 'prefunded',
          application: { id: application.id, status: 'accepted' },
          escrow: {
            id: escrow.id,
            transactionId: escrow.create_tx || null,
            amount: Number(escrow.amount || 0),
            escrowRecordId: escrow.escrow_record_id || null,
          },
          warnings: {
            escrowRecordId: escrow.escrow_record_id
              ? undefined
              : 'Escrow record reference not found yet. Run escrow sync before release/refund.',
          },
        },
      });
    }

    if (!escrowTransactionId && !employerPrivateKey) {
      return res.status(400).json({
        success: false,
        message: 'Missing escrow proof. Provide escrowTransactionId (wallet mode) or employerPrivateKey (legacy mode).',
      });
    }

    if (!escrowTransactionId && employerPrivateKey) {
      return res.status(400).json({
        success: false,
        message: 'Legacy private-key escrow creation is disabled for escrow_v4. Use wallet-based escrow transaction.',
      });
    }

    const escrowAmount = parseEscrowAmount(amount, job.budget);
    if (!escrowAmount || escrowAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid or missing payment amount' });
    }

    let finalTransactionId = '';
    let finalEscrowRecordId = providedEscrowRecordId;
    let mode: 'wallet' | 'legacy' = 'wallet';
    const warnings: Record<string, string | undefined> = {};

    if (escrowTransactionId) {
      const transaction = await waitForTransaction(escrowTransactionId, 6, 2000);
      if (!transaction) {
        warnings.transactionVerification =
          'Escrow transaction is still indexing on Aleo. Accepted provisionally and queued for reconciliation.';
      } else {
        const txStatus = normalizeTransactionStatus(transaction);
        if (isFailedStatus(txStatus)) {
          return res.status(400).json({
            success: false,
            message: `Escrow transaction failed with status: ${txStatus}`,
          });
        }

        const verified = verifyEscrowCreateTransaction({
          transaction,
          expectedProgramId: ALEO_CONFIG.programs.escrow,
          payerAddress: aleoAddress,
          payeeAddress: freelancer.aleo_address,
          amount: escrowAmount,
        });

        // Require strict match only once the tx is finalized.
        if (!verified && isConfirmedStatus(txStatus)) {
          return res.status(400).json({
            success: false,
            message: `Escrow transaction does not match ${ALEO_CONFIG.programs.escrow}/create_escrow`,
          });
        }

        if (!verified) {
          warnings.transactionVerification =
            'Escrow transaction metadata is still partial. Saved provisionally and will be reconciled automatically.';
        }

        finalEscrowRecordId = providedEscrowRecordId || extractEscrowRecordId(transaction);
      }

      finalTransactionId = escrowTransactionId;
      mode = 'wallet';
    }

    const escrow = await updateApplicationAndCreateEscrow({
      applicationId,
      jobId: job.id,
      employerId: user.id,
      freelancerId: freelancer.id,
      amount: escrowAmount,
      transactionId: finalTransactionId,
      escrowRecordId: finalEscrowRecordId,
    });

    return res.status(200).json({
      success: true,
      message: 'Application accepted and escrow created',
      data: {
        mode,
        application: { id: application.id, status: 'accepted' },
        escrow: {
          id: escrow.id,
          transactionId: finalTransactionId,
          amount: escrowAmount,
          escrowRecordId: finalEscrowRecordId || null,
        },
        warnings: {
          ...warnings,
          escrowRecordId: finalEscrowRecordId
            ? undefined
            : 'Escrow record reference not found in transaction payload. Release/refund may require manual sync.',
        },
      },
    });
  } catch (error: any) {
    console.error('[API] Accept application error:', error);
    return res.status(500).json({
      success: false,
      message: error?.message || 'Failed to accept application',
    });
  }
}

export async function handleGetAccept(_req: Request, res: Response) {
  res.json({
    status: 'ok',
    message: 'Accept application endpoint is available',
    method: 'POST',
  });
}
