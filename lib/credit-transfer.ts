// Credit Transfer Utility
// Handles credit deduction for job seekers (1 credit) and job givers (3 credits)

import { ALEO_CONFIG, ALEO_CREDITS } from './aleo-config';

export interface CreditTransferResult {
  success: boolean;
  transactionId?: string;
  error?: string;
}

/**
 * Transfer credits using the wallet adapter
 * For job seekers: deducts 1 credit
 * For job givers: deducts 3 credits
 * 
 * Uses the wallet adapter's executeTransaction method to call the access_control contract
 */
export async function transferCredits(
  executeTransaction: ((options: any) => Promise<{ transactionId: string } | undefined>) | null | undefined,
  address: string,
  isJobGiver: boolean
): Promise<CreditTransferResult> {
  if (!executeTransaction || !address) {
    return { success: false, error: 'Wallet not connected or transaction execution not available' };
  }

  const credits = isJobGiver ? ALEO_CREDITS.JOB_GIVER_ACCESS : ALEO_CREDITS.JOB_SEEKER_ACCESS;
  const functionName = isJobGiver ? 'pay_job_giver_access' : 'pay_job_seeker_access';
  const programId = ALEO_CONFIG.programs.accessControl;

  try {
    // Use the executeTransaction function from useWallet hook
    console.log('Executing transaction:', { programId, functionName, address, fee: credits * 1_000_000 });
    
    const result = await executeTransaction({
      program: programId,
      function: functionName,
      inputs: [address],
      fee: credits * 1_000_000, // Convert credits to microcredits (1 credit = 1,000,000 microcredits)
    });

    if (!result || !result.transactionId) {
      return {
        success: false,
        error: 'Transaction was executed but no transaction ID was returned. Please check your wallet.',
      };
    }

    return {
      success: true,
      transactionId: result.transactionId,
    };
  } catch (error: any) {
    console.error('Credit transfer error:', error);
    const errorMessage = error?.message || error?.toString() || 'Unknown error';
    
    // Provide more helpful error messages
    if (errorMessage.includes('reject') || errorMessage.includes('denied') || errorMessage.includes('cancel')) {
      return {
        success: false,
        error: 'Transaction was rejected. Please approve the transaction in your wallet.',
      };
    }
    
    if (errorMessage.includes('insufficient') || errorMessage.includes('balance')) {
      return {
        success: false,
        error: `Insufficient credits. You need ${credits} credit${credits > 1 ? 's' : ''} but don't have enough in your wallet.`,
      };
    }

    return {
      success: false,
      error: `Transaction failed: ${errorMessage}. Please check your wallet and try again.`,
    };
  }
}







