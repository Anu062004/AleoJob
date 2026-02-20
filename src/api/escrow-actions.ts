import { createClient } from '@supabase/supabase-js';
import { Request, Response } from 'express';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, join } from 'path';

type EscrowResult = {
  success: boolean;
  transactionId?: string;
  escrowId?: string;
  status?: 'released' | 'refunded';
  error?: string;
};

type EscrowServiceModule = {
  releaseEscrow: (escrowId: string, employerId: string, privateKey: string) => Promise<EscrowResult>;
  refundEscrow: (
    escrowId: string,
    employerId: string,
    privateKey: string,
    refundReason?: number
  ) => Promise<EscrowResult>;
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

let escrowService: EscrowServiceModule | null = null;
let aleoService: any = null;
let ALEO_CONFIG: any = null;

async function loadDependencies() {
  if (!escrowService) {
    const escrowServicePath = pathToFileURL(join(rootDir, 'lib', 'escrow-service.ts')).href;
    escrowService = (await import(escrowServicePath)) as EscrowServiceModule;
  }

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

async function findEmployerByAddress(
  aleoAddress: string
): Promise<{ id: string; role: 'seeker' | 'giver' | null } | null> {
  if (!supabaseAdmin) {
    throw new Error('Server configuration error: Database not configured');
  }

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id, role')
    .eq('aleo_address', aleoAddress)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    role: data.role === 'seeker' || data.role === 'giver' ? data.role : null,
  };
}

function toStatusCode(resultError: string | undefined): number {
  if (!resultError) return 500;
  const lower = resultError.toLowerCase();
  if (lower.includes('not found')) return 404;
  if (lower.includes('do not own')) return 403;
  if (lower.includes('already') || lower.includes('cannot')) return 400;
  return 500;
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

function verifyEscrowActionTransaction(options: {
  transaction: unknown;
  expectedProgramId: string;
  expectedFunction: 'release_payment' | 'refund_payment';
  expectedPayeeAddress?: string;
}): boolean {
  const {
    transaction,
    expectedProgramId,
    expectedFunction,
    expectedPayeeAddress,
  } = options;

  if (!transaction) return false;

  const txText = JSON.stringify(transaction).toLowerCase();
  if (!txText) return false;

  const hasProgram = txText.includes(expectedProgramId.toLowerCase());
  const hasFunction = txText.includes(expectedFunction.toLowerCase());
  if (!hasProgram || !hasFunction) return false;

  // release_payment uses private inputs; payee/proof may not be visible in tx payload.
  // Accept tx if core function/program match. If payee is visible, optionally verify it.
  if (expectedFunction === 'release_payment' && expectedPayeeAddress) {
    const payeeVisible = txText.includes(expectedPayeeAddress.toLowerCase());
    const payoutTransitionVisible = txText.includes('transfer_public_to_private');
    if (!payeeVisible && !payoutTransitionVisible) {
      return false;
    }
  }

  return true;
}

async function getEscrowForEmployer(escrowId: string, employerId: string) {
  if (!supabaseAdmin) {
    throw new Error('Server configuration error: Database not configured');
  }

  const { data, error } = await supabaseAdmin
    .from('escrows')
    .select('id, job_id, employer_id, freelancer_id, status, release_tx, refund_tx')
    .eq('id', escrowId)
    .single();

  if (error || !data) {
    return { escrow: null, error: 'Escrow not found' };
  }

  if (data.employer_id !== employerId) {
    return { escrow: null, error: 'You do not own this escrow' };
  }

  return { escrow: data as any, error: null };
}

async function getVerifiedWorkProof(
  jobId: string,
  seekerId: string
): Promise<{ verified: boolean; proofHash: string }> {
  if (!supabaseAdmin) {
    return { verified: false, proofHash: '' };
  }

  const { data, error } = await supabaseAdmin
    .from('applications')
    .select('id, work_proof_status, work_proof_hash')
    .eq('job_id', jobId)
    .eq('seeker_id', seekerId)
    .eq('status', 'accepted')
    .maybeSingle();

  if (error || !data) {
    return { verified: false, proofHash: '' };
  }

  const proofHash = typeof (data as any).work_proof_hash === 'string' ? (data as any).work_proof_hash.trim() : '';
  const verified = data.work_proof_status === 'verified' && Boolean(proofHash);
  return { verified, proofHash };
}

async function getProfileAleoAddress(profileId: string): Promise<string> {
  if (!supabaseAdmin || !profileId) return '';

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('aleo_address')
    .eq('id', profileId)
    .maybeSingle();

  if (error || !data?.aleo_address) {
    return '';
  }

  return String(data.aleo_address).trim().toLowerCase();
}

async function applyEscrowActionUpdate(options: {
  escrowId: string;
  jobId: string;
  action: 'release' | 'refund';
  transactionId: string;
}) {
  if (!supabaseAdmin) {
    throw new Error('Server configuration error: Database not configured');
  }

  const escrowUpdate =
    options.action === 'release'
      ? { status: 'released', release_tx: options.transactionId, updated_at: new Date().toISOString() }
      : { status: 'refunded', refund_tx: options.transactionId, updated_at: new Date().toISOString() };

  const { error: escrowError } = await supabaseAdmin
    .from('escrows')
    .update(escrowUpdate)
    .eq('id', options.escrowId);

  if (escrowError) {
    throw new Error(`Failed to update escrow status: ${escrowError.message}`);
  }

  const paymentStatus = options.action === 'release' ? 'completed' : 'refunded';

  const { error: jobError } = await supabaseAdmin
    .from('jobs')
    .update({ payment_status: paymentStatus })
    .eq('id', options.jobId);

  if (jobError) {
    console.error('[Escrow Actions] Failed to update job payment status:', jobError);
  }
}

async function handleWalletEscrowFinalize(options: {
  escrowId: string;
  aleoAddress: string;
  employerId: string;
  transactionId: string;
  action: 'release' | 'refund';
}) {
  await loadDependencies();

  const { escrow, error } = await getEscrowForEmployer(options.escrowId, options.employerId);
  if (error || !escrow) {
    return { status: toStatusCode(error || undefined), error: error || 'Escrow not found' };
  }

  if (escrow.status !== 'locked') {
    return {
      status: 400,
      error: `Escrow already processed. Current status: ${escrow.status}`,
    };
  }

  if (options.action === 'release' && escrow.release_tx) {
    return { status: 400, error: 'Release transaction already exists' };
  }

  if (options.action === 'refund' && escrow.refund_tx) {
    return { status: 400, error: 'Refund transaction already exists' };
  }

  let expectedPayeeAddress = '';
  if (options.action === 'release') {
    const proofState = await getVerifiedWorkProof(escrow.job_id, escrow.freelancer_id);
    if (!proofState.verified) {
      return {
        status: 400,
        error: 'Cannot release escrow yet. Seeker proof of work must be verified first.',
      };
    }
    expectedPayeeAddress = await getProfileAleoAddress(escrow.freelancer_id);
    if (!expectedPayeeAddress) {
      return {
        status: 400,
        error: 'Cannot release escrow: accepted seeker wallet address is missing.',
      };
    }
  }

  const transaction = await aleoService.getTransaction(options.transactionId);
  if (!transaction) {
    return { status: 400, error: 'Unable to verify wallet transaction on Aleo network' };
  }

  const txStatus = normalizeTransactionStatus(transaction);
  if (isFailedStatus(txStatus)) {
    return { status: 400, error: `Wallet transaction failed with status: ${txStatus}` };
  }

  const expectedFunction = options.action === 'release' ? 'release_payment' : 'refund_payment';
  const isVerified = verifyEscrowActionTransaction({
    transaction,
    expectedProgramId: ALEO_CONFIG.programs.escrow,
    expectedFunction,
    expectedPayeeAddress,
  });

  if (!isVerified) {
    return {
      status: 400,
      error: `Wallet transaction does not match ${ALEO_CONFIG.programs.escrow}/${expectedFunction}`,
    };
  }

  await applyEscrowActionUpdate({
    escrowId: options.escrowId,
    jobId: escrow.job_id,
    action: options.action,
    transactionId: options.transactionId,
  });

  return {
    status: 200,
    data: {
      success: true,
      transactionId: options.transactionId,
      escrowId: options.escrowId,
      status: options.action === 'release' ? 'released' : 'refunded',
      mode: 'wallet',
    },
  };
}

export async function handleReleaseEscrow(req: Request, res: Response) {
  try {
    const { escrowId, employerPrivateKey, aleoAddress, transactionId } = req.body || {};

    if (!escrowId || !aleoAddress) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: escrowId, aleoAddress',
      });
    }

    const employer = await findEmployerByAddress(aleoAddress);
    if (!employer) {
      return res.status(404).json({
        success: false,
        error: 'User not found. Please ensure you are authenticated.',
      });
    }

    if (employer.role !== 'giver') {
      return res.status(403).json({
        success: false,
        error: 'This wallet is not registered as a job giver.',
      });
    }

    if (transactionId) {
      const walletResult = await handleWalletEscrowFinalize({
        escrowId,
        aleoAddress,
        employerId: employer.id,
        transactionId,
        action: 'release',
      });

      if (walletResult.status !== 200) {
        return res.status(walletResult.status).json({
          success: false,
          error: walletResult.error,
        });
      }

      return res.status(200).json(walletResult.data);
    }

    if (!employerPrivateKey) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: transactionId (wallet mode) or employerPrivateKey (legacy mode)',
      });
    }

    await loadDependencies();
    const service = escrowService as EscrowServiceModule;
    const result = await service.releaseEscrow(escrowId, employer.id, employerPrivateKey);

    if (!result.success) {
      return res.status(toStatusCode(result.error)).json({
        success: false,
        error: result.error || 'Failed to release escrow',
      });
    }

    return res.status(200).json({
      success: true,
      transactionId: result.transactionId,
      escrowId: result.escrowId,
      status: result.status,
      mode: 'legacy',
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to release escrow',
    });
  }
}

export async function handleRefundEscrow(req: Request, res: Response) {
  try {
    const { escrowId, employerPrivateKey, aleoAddress, transactionId, refundReason = 0 } = req.body || {};

    if (!escrowId || !aleoAddress) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: escrowId, aleoAddress',
      });
    }

    const employer = await findEmployerByAddress(aleoAddress);
    if (!employer) {
      return res.status(404).json({
        success: false,
        error: 'User not found. Please ensure you are authenticated.',
      });
    }

    if (employer.role !== 'giver') {
      return res.status(403).json({
        success: false,
        error: 'This wallet is not registered as a job giver.',
      });
    }

    if (transactionId) {
      const walletResult = await handleWalletEscrowFinalize({
        escrowId,
        aleoAddress,
        employerId: employer.id,
        transactionId,
        action: 'refund',
      });

      if (walletResult.status !== 200) {
        return res.status(walletResult.status).json({
          success: false,
          error: walletResult.error,
        });
      }

      return res.status(200).json(walletResult.data);
    }

    if (!employerPrivateKey) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: transactionId (wallet mode) or employerPrivateKey (legacy mode)',
      });
    }

    await loadDependencies();
    const service = escrowService as EscrowServiceModule;
    const result = await service.refundEscrow(escrowId, employer.id, employerPrivateKey, refundReason);

    if (!result.success) {
      return res.status(toStatusCode(result.error)).json({
        success: false,
        error: result.error || 'Failed to refund escrow',
      });
    }

    return res.status(200).json({
      success: true,
      transactionId: result.transactionId,
      escrowId: result.escrowId,
      status: result.status,
      mode: 'legacy',
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to refund escrow',
    });
  }
}
