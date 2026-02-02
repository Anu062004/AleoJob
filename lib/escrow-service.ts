// Escrow Service Layer
// Handles all escrow business logic with proper validation and error handling

import { supabaseAdmin } from '@/lib/supabaseServer';
import { aleoService } from '@/lib/aleo-service';

export interface EscrowReleaseResult {
  success: boolean;
  transactionId?: string;
  escrowId?: string;
  status?: 'released';
  error?: string;
}

export interface EscrowRefundResult {
  success: boolean;
  transactionId?: string;
  escrowId?: string;
  status?: 'refunded';
  error?: string;
}

/**
 * Release escrow funds after job completion
 * @param escrowId - UUID of the escrow record
 * @param employerId - UUID of the employer (from profiles table)
 * @param employerPrivateKey - Aleo private key for signing transaction
 * @returns EscrowReleaseResult
 */
export async function releaseEscrow(
  escrowId: string,
  employerId: string,
  employerPrivateKey: string
): Promise<EscrowReleaseResult> {
  try {
    // 1. Fetch escrow from database
    const { data: escrow, error: escrowError } = await supabaseAdmin
      .from('escrows')
      .select(`
        id,
        job_id,
        employer_id,
        freelancer_id,
        status,
        escrow_record_id,
        release_tx,
        amount,
        freelancer:profiles!escrows_freelancer_id_fkey(aleo_address)
      `)
      .eq('id', escrowId)
      .single();

    if (escrowError || !escrow) {
      return {
        success: false,
        error: 'Escrow not found',
      };
    }

    // 2. Validate ownership
    if (escrow.employer_id !== employerId) {
      return {
        success: false,
        error: 'You do not own this escrow',
      };
    }

    // 3. Validate status - must be locked
    if (escrow.status !== 'locked') {
      return {
        success: false,
        error: `Escrow already processed. Current status: ${escrow.status}`,
      };
    }

    // 4. Prevent double release
    if (escrow.release_tx) {
      return {
        success: false,
        error: 'Release transaction already exists',
      };
    }

    // 5. Validate freelancer has Aleo address
    const freelancer = (escrow as any).freelancer;
    if (!freelancer || !freelancer.aleo_address) {
      return {
        success: false,
        error: 'Freelancer does not have an Aleo address',
      };
    }

    // 6. Validate escrow record ID exists
    if (!escrow.escrow_record_id) {
      return {
        success: false,
        error: 'Escrow record ID not found. Escrow may not be properly created on blockchain.',
      };
    }

    // 7. Call Aleo smart contract transition: release_payment
    // Note: The escrow_record_id should be the PaymentEscrow record
    // For now, we pass it as-is. In production, you'd fetch the actual record from Aleo
    const completionProof = '0field'; // Proof that job is complete (can be enhanced later)
    
    const releaseResult = await aleoService.releaseEscrow(
      escrow.escrow_record_id,
      employerPrivateKey
    );

    // 8. If blockchain call fails, DO NOT update database
    if (!releaseResult.success) {
      return {
        success: false,
        error: releaseResult.error || 'Failed to release payment on Aleo blockchain',
      };
    }

    // 9. Update database in transaction
    // Update escrow status
    const { error: escrowUpdateError } = await supabaseAdmin
      .from('escrows')
      .update({
        status: 'released',
        release_tx: releaseResult.transactionId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', escrowId);

    if (escrowUpdateError) {
      console.error('Error updating escrow status:', escrowUpdateError);
      return {
        success: false,
        error: 'Failed to update escrow record in database',
      };
    }

    // Update job payment status
    const { error: jobUpdateError } = await supabaseAdmin
      .from('jobs')
      .update({ payment_status: 'completed' })
      .eq('id', escrow.job_id);

    if (jobUpdateError) {
      console.error('Error updating job payment status:', jobUpdateError);
      // Log but don't fail - escrow is already released on blockchain
    }

    // 10. Log transaction
    console.log(`[Escrow Release] Escrow ${escrowId} released. TX: ${releaseResult.transactionId}`);

    return {
      success: true,
      transactionId: releaseResult.transactionId,
      escrowId: escrow.id,
      status: 'released',
    };
  } catch (error: any) {
    console.error('Release escrow error:', error);
    return {
      success: false,
      error: error.message || 'Failed to release escrow',
    };
  }
}

/**
 * Refund escrow funds if job is cancelled
 * @param escrowId - UUID of the escrow record
 * @param employerId - UUID of the employer (from profiles table)
 * @param employerPrivateKey - Aleo private key for signing transaction
 * @param refundReason - Reason for refund (0 = cancellation, 1 = dispute)
 * @returns EscrowRefundResult
 */
export async function refundEscrow(
  escrowId: string,
  employerId: string,
  employerPrivateKey: string,
  refundReason: number = 0
): Promise<EscrowRefundResult> {
  try {
    // 1. Fetch escrow from database
    const { data: escrow, error: escrowError } = await supabaseAdmin
      .from('escrows')
      .select(`
        id,
        job_id,
        employer_id,
        status,
        escrow_record_id,
        refund_tx,
        employer:profiles!escrows_employer_id_fkey(aleo_address)
      `)
      .eq('id', escrowId)
      .single();

    if (escrowError || !escrow) {
      return {
        success: false,
        error: 'Escrow not found',
      };
    }

    // 2. Validate ownership
    if (escrow.employer_id !== employerId) {
      return {
        success: false,
        error: 'You do not own this escrow',
      };
    }

    // 3. Validate status - must be locked
    if (escrow.status !== 'locked') {
      if (escrow.status === 'released') {
        return {
          success: false,
          error: 'Cannot refund a released payment',
        };
      }
      if (escrow.status === 'refunded') {
        return {
          success: false,
          error: 'Payment has already been refunded',
        };
      }
      return {
        success: false,
        error: `Escrow already processed. Current status: ${escrow.status}`,
      };
    }

    // 4. Prevent double refund
    if (escrow.refund_tx) {
      return {
        success: false,
        error: 'Refund transaction already exists',
      };
    }

    // 5. Validate escrow record ID exists
    if (!escrow.escrow_record_id) {
      return {
        success: false,
        error: 'Escrow record ID not found. Escrow may not be properly created on blockchain.',
      };
    }

    // 6. Validate refund reason
    if (refundReason !== 0 && refundReason !== 1) {
      return {
        success: false,
        error: 'Invalid refund reason. Must be 0 (cancellation) or 1 (dispute)',
      };
    }

    // 7. Call Aleo smart contract transition: refund_payment
    const refundResult = await aleoService.refundEscrow(
      escrow.escrow_record_id,
      employerPrivateKey,
      refundReason
    );

    // 8. If blockchain call fails, DO NOT update database
    if (!refundResult.success) {
      return {
        success: false,
        error: refundResult.error || 'Failed to refund payment on Aleo blockchain',
      };
    }

    // 9. Update database in transaction
    // Update escrow status
    const { error: escrowUpdateError } = await supabaseAdmin
      .from('escrows')
      .update({
        status: 'refunded',
        refund_tx: refundResult.transactionId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', escrowId);

    if (escrowUpdateError) {
      console.error('Error updating escrow status:', escrowUpdateError);
      return {
        success: false,
        error: 'Failed to update escrow record in database',
      };
    }

    // Update job payment status
    const { error: jobUpdateError } = await supabaseAdmin
      .from('jobs')
      .update({ payment_status: 'refunded' })
      .eq('id', escrow.job_id);

    if (jobUpdateError) {
      console.error('Error updating job payment status:', jobUpdateError);
      // Log but don't fail - escrow is already refunded on blockchain
    }

    // 10. Log transaction
    console.log(`[Escrow Refund] Escrow ${escrowId} refunded. TX: ${refundResult.transactionId}, Reason: ${refundReason}`);

    return {
      success: true,
      transactionId: refundResult.transactionId,
      escrowId: escrow.id,
      status: 'refunded',
    };
  } catch (error: any) {
    console.error('Refund escrow error:', error);
    return {
      success: false,
      error: error.message || 'Failed to refund escrow',
    };
  }
}




