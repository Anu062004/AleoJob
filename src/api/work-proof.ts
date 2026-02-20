import { createClient } from '@supabase/supabase-js';
import type { Request, Response } from 'express';
import { ALEO_CONFIG } from '../../lib/aleo-config';
import { aleoService } from '../../lib/aleo-service';

type MarketplaceRole = 'seeker' | 'giver';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabaseAdmin =
  supabaseUrl && serviceRoleKey
    ? createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : null;

function normalizeText(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.trim();
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

function toAleoField(value: string): string {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    const charCode = value.charCodeAt(index);
    hash = ((hash << 5) - hash) + charCode;
    hash |= 0;
  }
  return `${Math.abs(hash)}field`;
}

function isLikelyUrl(value: string): boolean {
  if (!value) return false;
  return /^https?:\/\/\S+$/i.test(value) || /^ipfs:\/\/\S+$/i.test(value);
}

function encodeProofNotes(proofUrl: string): string {
  return `url:${proofUrl}`;
}

function decodeProofUrlFromNotes(notes: unknown): string {
  const text = normalizeText(notes);
  if (!text) return '';
  if (text.toLowerCase().startsWith('url:')) {
    return text.slice(4).trim();
  }
  return '';
}

function verifyProofTransaction(options: {
  transaction: unknown;
  functionName: 'submit_work_proof';
  aleoAddress: string;
  proofHash: string;
}): boolean {
  const { transaction, functionName, aleoAddress, proofHash } = options;
  if (!transaction) return false;

  const txText = JSON.stringify(transaction).toLowerCase();
  if (!txText) return false;

  const hasProgram = txText.includes(ALEO_CONFIG.programs.escrow.toLowerCase());
  const hasFunction = txText.includes(functionName.toLowerCase());
  const hasAddress = !aleoAddress || txText.includes(aleoAddress.toLowerCase());
  const hasProofHash = !proofHash || txText.includes(proofHash.toLowerCase());

  return hasProgram && hasFunction && hasAddress && hasProofHash;
}

async function findProfileByAddress(aleoAddress: string): Promise<{ id: string; role: MarketplaceRole | null } | null> {
  if (!supabaseAdmin) return null;

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id, role')
    .eq('aleo_address', aleoAddress)
    .single();

  if (error || !data) return null;
  const role = data.role === 'seeker' || data.role === 'giver' ? data.role : null;
  return { id: data.id, role };
}

async function getApplicationWithJob(applicationId: string) {
  if (!supabaseAdmin) return { data: null, error: 'Database not configured' };

  const { data, error } = await supabaseAdmin
    .from('applications')
    .select(
      `
      id,
      job_id,
      seeker_id,
      status,
      work_proof_hash,
      work_proof_tx,
      work_proof_status,
      work_proof_notes,
      jobs!inner (
        id,
        giver_id
      ),
      seeker:profiles!applications_seeker_id_fkey (
        aleo_address
      )
      `
    )
    .eq('id', applicationId)
    .single();

  if (error || !data) {
    return { data: null, error: 'Application not found' };
  }

  return { data: data as any, error: null };
}

export async function handleSubmitWorkProof(req: Request, res: Response) {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({
        success: false,
        error: 'Server configuration error: Database not configured.',
      });
    }

    const { applicationId, aleoAddress, transactionId, proofHash, proofUrl } = req.body || {};
    const normalizedAddress = normalizeText(aleoAddress);
    const normalizedTx = normalizeText(transactionId);
    const normalizedProofHash = normalizeText(proofHash);
    const normalizedProofUrl = normalizeText(proofUrl);

    if (!applicationId || !normalizedAddress) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: applicationId, aleoAddress',
      });
    }

    const hasOnChainPayload = Boolean(normalizedTx && normalizedProofHash);
    const hasUrlPayload = Boolean(normalizedProofUrl);

    if (!hasOnChainPayload && !hasUrlPayload) {
      return res.status(400).json({
        success: false,
        error: 'Provide either (transactionId + proofHash) or proofUrl.',
      });
    }

    if (hasUrlPayload && !isLikelyUrl(normalizedProofUrl)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid proof URL format. Use http(s)://... or ipfs://...',
      });
    }

    const seeker = await findProfileByAddress(normalizedAddress);
    if (!seeker) {
      return res.status(404).json({ success: false, error: 'Seeker profile not found' });
    }
    if (seeker.role !== 'seeker') {
      return res.status(403).json({
        success: false,
        error: 'This wallet is not registered as a seeker.',
      });
    }

    const { data: application, error: applicationError } = await getApplicationWithJob(String(applicationId));
    if (applicationError || !application) {
      return res.status(404).json({ success: false, error: applicationError || 'Application not found' });
    }

    if (application.seeker_id !== seeker.id) {
      return res.status(403).json({ success: false, error: 'You do not own this application' });
    }

    if (application.status !== 'accepted') {
      return res.status(400).json({
        success: false,
        error: 'Work proof can only be submitted for accepted applications.',
      });
    }

    let finalProofHash = normalizedProofHash;
    let finalProofTx: string | null = normalizedTx || null;
    let finalProofNotes: string | null = null;

    if (hasOnChainPayload) {
      const transaction = await aleoService.getTransaction(normalizedTx);
      if (!transaction) {
        return res.status(400).json({
          success: false,
          error: 'Unable to verify work proof transaction on Aleo network.',
        });
      }

      const txStatus = normalizeTransactionStatus(transaction);
      if (isFailedStatus(txStatus)) {
        return res.status(400).json({
          success: false,
          error: `Work proof transaction failed with status: ${txStatus}`,
        });
      }

      const validProofTx = verifyProofTransaction({
        transaction,
        functionName: 'submit_work_proof',
        aleoAddress: normalizedAddress,
        proofHash: normalizedProofHash,
      });

      if (!validProofTx) {
        return res.status(400).json({
          success: false,
          error: `Transaction does not match ${ALEO_CONFIG.programs.escrow}/submit_work_proof`,
        });
      }

      if (hasUrlPayload) {
        finalProofNotes = encodeProofNotes(normalizedProofUrl);
      }
    } else {
      finalProofHash = toAleoField(normalizedProofUrl);
      finalProofTx = null;
      finalProofNotes = encodeProofNotes(normalizedProofUrl);
    }

    const { error: updateError } = await supabaseAdmin
      .from('applications')
      .update({
        work_proof_hash: finalProofHash,
        work_proof_tx: finalProofTx,
        work_proof_status: 'submitted',
        work_proof_submitted_at: new Date().toISOString(),
        work_proof_verified_at: null,
        work_proof_notes: finalProofNotes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', application.id);

    if (updateError) {
      return res.status(500).json({
        success: false,
        error: updateError.message || 'Failed to store work proof.',
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        applicationId: application.id,
        workProofStatus: 'submitted',
        transactionId: finalProofTx || undefined,
        proofHash: finalProofHash,
        proofUrl: normalizedProofUrl || undefined,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to submit work proof',
    });
  }
}

export async function handleVerifyWorkProof(req: Request, res: Response) {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({
        success: false,
        error: 'Server configuration error: Database not configured.',
      });
    }

    const { applicationId, aleoAddress } = req.body || {};
    const normalizedAddress = normalizeText(aleoAddress);

    if (!applicationId || !normalizedAddress) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: applicationId, aleoAddress',
      });
    }

    const giver = await findProfileByAddress(normalizedAddress);
    if (!giver) {
      return res.status(404).json({ success: false, error: 'Giver profile not found' });
    }
    if (giver.role !== 'giver') {
      return res.status(403).json({
        success: false,
        error: 'This wallet is not registered as a giver.',
      });
    }

    const { data: application, error: applicationError } = await getApplicationWithJob(String(applicationId));
    if (applicationError || !application) {
      return res.status(404).json({ success: false, error: applicationError || 'Application not found' });
    }

    const job = application.jobs as { id: string; giver_id: string };
    const seeker = application.seeker as { aleo_address: string | null } | null;

    if (job.giver_id !== giver.id) {
      return res.status(403).json({
        success: false,
        error: 'You do not own this application/job.',
      });
    }

    if (application.status !== 'accepted') {
      return res.status(400).json({
        success: false,
        error: 'Only accepted applications can be verified.',
      });
    }

    if (!application.work_proof_hash) {
      return res.status(400).json({
        success: false,
        error: 'Seeker has not submitted work proof yet.',
      });
    }

    if (application.work_proof_status === 'verified') {
      return res.status(200).json({
        success: true,
        data: {
          applicationId: application.id,
          workProofStatus: 'verified',
          transactionId: application.work_proof_tx,
        },
      });
    }

    const hasOnChainProof = Boolean(normalizeText(application.work_proof_tx));
    if (hasOnChainProof) {
      const transaction = await aleoService.getTransaction(String(application.work_proof_tx));
      if (!transaction) {
        return res.status(400).json({
          success: false,
          error: 'Unable to load seeker work proof transaction from Aleo.',
        });
      }

      const txStatus = normalizeTransactionStatus(transaction);
      if (isFailedStatus(txStatus)) {
        return res.status(400).json({
          success: false,
          error: `Work proof transaction is not valid. Status: ${txStatus}`,
        });
      }

      const seekerAddress = normalizeText(seeker?.aleo_address);
      const validProofTx = verifyProofTransaction({
        transaction,
        functionName: 'submit_work_proof',
        aleoAddress: seekerAddress,
        proofHash: normalizeText(application.work_proof_hash),
      });

      if (!validProofTx) {
        return res.status(400).json({
          success: false,
          error: `Work proof transaction does not match ${ALEO_CONFIG.programs.escrow}/submit_work_proof`,
        });
      }
    } else {
      const proofUrl = decodeProofUrlFromNotes(application.work_proof_notes);
      if (!proofUrl) {
        return res.status(400).json({
          success: false,
          error: 'Proof is missing transaction metadata and URL reference.',
        });
      }
    }

    const { error: updateError } = await supabaseAdmin
      .from('applications')
      .update({
        work_proof_status: 'verified',
        work_proof_verified_at: new Date().toISOString(),
        work_proof_notes: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', application.id);

    if (updateError) {
      return res.status(500).json({
        success: false,
        error: updateError.message || 'Failed to mark proof as verified.',
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        applicationId: application.id,
        workProofStatus: 'verified',
        transactionId: application.work_proof_tx,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to verify work proof',
    });
  }
}
