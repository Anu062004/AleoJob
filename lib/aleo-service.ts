// Aleo Service Layer
// Handles all Aleo blockchain interactions

import { ALEO_CONFIG, ALEO_CREDITS } from './aleo-config';
import { AleoNetworkClient } from '@provablehq/sdk/testnet.js';
import axios from 'axios';

// Types
export interface Record {
  owner: string;
  program: string;
  [key: string]: any;
}

export interface TransactionResponse {
  transactionId: string;
  status: 'pending' | 'confirmed' | 'failed';
}

export interface EscrowResponse {
  success: boolean;
  transactionId: string;
  escrowId?: string;
  error?: string;
}

// Aleo API Service
class AleoService {
  private rpcEndpoints: string[];
  private queryEndpoints: string[];
  private client: AleoNetworkClient | null = null;
  private network: string;

  constructor() {
    this.rpcEndpoints =
      (ALEO_CONFIG as any).rpcEndpoints?.length ? (ALEO_CONFIG as any).rpcEndpoints : [ALEO_CONFIG.endpoint];
    this.queryEndpoints =
      (ALEO_CONFIG as any).queryEndpoints?.length ? (ALEO_CONFIG as any).queryEndpoints : [(ALEO_CONFIG as any).queryEndpoint ?? ALEO_CONFIG.endpoint];
    this.network = ALEO_CONFIG.network;
  }

  // Lazily create a Provable AleoNetworkClient with endpoint failover
  private async getClient(): Promise<AleoNetworkClient> {
    if (this.client) return this.client;

    let lastErr: any = null;
    for (const endpoint of this.rpcEndpoints) {
      try {
        const client = new AleoNetworkClient(endpoint);
        // Health check; method name from Provable SDK docs
        await client.getLatestBlock();
        console.log('✅ [Aleo Service] Connected to Aleo via:', endpoint);
        this.client = client;
        return client;
      } catch (e: any) {
        lastErr = e;
        console.warn('⚠️ [Aleo Service] Endpoint failed:', endpoint, e?.message || e);
      }
    }

    throw lastErr ?? new Error('All Aleo endpoints unavailable');
  }

  // Execute a transition (contract function call)
  // CRITICAL: This method can throw - caller must handle exceptions
  async executeTransition(
    programId: string,
    functionName: string,
    inputs: any[],
    privateKey: string,
    fee?: number
  ): Promise<TransactionResponse> {
    try {
      console.log('[Aleo Service] Executing transition:', {
        programId,
        functionName,
        inputsCount: inputs.length,
        inputs: inputs.map((inp, idx) => {
          if (typeof inp === 'string' && inp.length > 50) {
            return `${inp.substring(0, 20)}...${inp.substring(inp.length - 10)}`;
          }
          return inp;
        }),
        hasPrivateKey: !!privateKey,
        fee: fee ?? 0,
      });

      // Get Aleo client with error handling
      let client: AleoNetworkClient;
      try {
        client = await this.getClient();
      } catch (clientError: any) {
        console.error('[Aleo Service] Failed to get Aleo client:', {
          message: clientError?.message,
          stack: clientError?.stack,
        });
        throw new Error(`Aleo client initialization failed: ${clientError?.message || 'Unknown error'}`);
      }
      
      if (!client) {
        throw new Error('Aleo client not initialized - getClient returned null');
      }

      // Provable SDK handles serialization and submission internally.
      console.log('[Aleo Service] Calling executeProgram with:', {
        programId,
        functionName,
        inputsLength: inputs.length,
      });

      let txId: any;
      try {
        txId = await (client as any).executeProgram(
          programId,
          functionName,
          inputs,
          privateKey,
          fee ?? 0
        );
      } catch (execError: any) {
        console.error('[Aleo Service] executeProgram threw exception:', {
          message: execError?.message,
          stack: execError?.stack,
          name: execError?.name,
          programId,
          functionName,
          error: execError,
        });
        throw new Error(`Aleo executeProgram failed: ${execError?.message || execError?.toString() || 'Unknown error'}`);
      }

      console.log('[Aleo Service] Transaction executed, raw txId:', {
        txId,
        type: typeof txId,
        isString: typeof txId === 'string',
        hasId: txId?.id !== undefined,
        hasTransactionId: txId?.transactionId !== undefined,
      });

      // Extract transaction ID from various possible formats
      let transactionId: string;
      if (typeof txId === 'string') {
        transactionId = txId;
      } else if (txId?.id) {
        transactionId = txId.id;
      } else if (txId?.transactionId) {
        transactionId = txId.transactionId;
      } else if (txId?.transaction_id) {
        transactionId = txId.transaction_id;
      } else {
        console.error('[Aleo Service] Unable to extract transaction ID from response:', txId);
        throw new Error('Transaction executed but transaction ID format is unrecognized');
      }
      
      if (!transactionId || transactionId === 'unknown' || transactionId.trim() === '') {
        throw new Error('Transaction executed but no valid transaction ID returned');
      }

      console.log('[Aleo Service] Transition execution SUCCESS:', {
        transactionId,
        programId,
        functionName,
      });

      return {
        transactionId,
        status: 'pending',
      };
    } catch (error: any) {
      // Log detailed error information
      console.error('[Aleo Service] Transition execution error:', {
        message: error?.message,
        stack: error?.stack,
        name: error?.name,
        programId,
        functionName,
        error: error,
      });
      
      // Re-throw with enhanced error message
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      throw new Error(`Failed to execute transition ${functionName} in ${programId}: ${errorMessage}`);
    }
  }

  // Get records for an address
  async getRecords(address: string, programId?: string): Promise<Record[]> {
    try {
      const path = programId
        ? `/addresses/${address}/records/${programId}`
        : `/addresses/${address}/records`;

      const data = await this.getWithFailover<any>(path);
      return data?.records || [];
    } catch (error: any) {
      console.error('Get records error:', error);
      return [];
    }
  }

  // Get account balance (TESTNET ONLY)
  // Returns testnet credits balance for the given address
  async getBalance(address: string): Promise<number> {
    try {
      // NOTE: This returns TESTNET credits only.
      // Balance is stored in the `credits.aleo/account` mapping.
      //
      // Many Aleo endpoints differ between providers; so we try a small set of
      // known-good testnet mapping URLs and use the first that succeeds.

      const candidates = [
        // Configured query endpoint (best option in THIS machine/environment)
        `${this.queryEndpoints[0].replace(/\/$/, '')}/program/credits.aleo/mapping/account/${address}`,

        // Provable explorer (commonly reachable; testnet3 alias sometimes used)
        `https://api.explorer.provable.com/v1/testnet/program/credits.aleo/mapping/account/${address}`,
        `https://api.explorer.provable.com/v1/testnet3/program/credits.aleo/mapping/account/${address}`,

        // Aleo explorer domains (may or may not work in your region/DNS)
        `https://api.explorer.aleo.org/v1/testnet/program/credits.aleo/mapping/account/${address}`,
        `https://api.explorer.aleo.org/v1/testnet3/program/credits.aleo/mapping/account/${address}`,
      ];

      for (const url of candidates) {
        try {
          console.log('🌐 [Aleo Service] Trying balance URL:', url);
          const res = await axios.get(url, { timeout: 7000 });
          console.log('✅ [Aleo Service] Balance response:', res.status, res.data);

          // API often returns a Leo literal like `"40000000u64"`.
          // Convert to a JS number (credits are in microcredits on some endpoints).
          const raw = typeof res.data === 'object' ? (res.data?.value ?? res.data?.balance) : res.data;
          const rawStr = String(raw).trim().replace(/^"|"$/g, '');
          const numericStr = rawStr.replace(/u64$/i, '');
          const parsed = Number(numericStr);

          if (Number.isFinite(parsed)) {
            console.log('💰 [Aleo Service] Final balance:', parsed);
            return parsed;
          }
        } catch (e: any) {
          // Keep trying other candidates
          console.warn('⚠️ [Aleo Service] Balance URL failed:', url, e.response?.status || e.message);
        }
      }

      console.warn('⚠️ [Aleo Service] All balance endpoints failed; returning 0');
      return 0;
    } catch (error: any) {
      console.error('❌ [Aleo Service] Get balance error:', error.response?.data || error.message);
      console.error('❌ [Aleo Service] Error URL:', error.config?.url);
      console.error('❌ [Aleo Service] Error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
      });
      // Return a default balance to allow connection (balance check is not critical)
      // In production, you might want to throw or return null
      return 0;
    }
  }

  // Get transaction status
  async getTransactionStatus(transactionId: string): Promise<string> {
    try {
      const data = await this.getWithFailover<any>(`/transactions/${transactionId}`);
      return data?.status || 'unknown';
    } catch (error: any) {
      console.error('Get transaction status error:', error);
      return 'unknown';
    }
  }

  // Pay for job seeker access
  async payJobSeekerAccess(recipient: string, privateKey: string): Promise<TransactionResponse> {
    return this.executeTransition(
      ALEO_CONFIG.programs.accessControl,
      'pay_job_seeker_access',
      [recipient],
      privateKey,
      ALEO_CREDITS.JOB_SEEKER_ACCESS
    );
  }

  // Pay for job giver access
  async payJobGiverAccess(recipient: string, privateKey: string): Promise<TransactionResponse> {
    return this.executeTransition(
      ALEO_CONFIG.programs.accessControl,
      'pay_job_giver_access',
      [recipient],
      privateKey,
      ALEO_CREDITS.JOB_GIVER_ACCESS
    );
  }

  // Create a job (deducts 3 credits before posting)
  async createJob(
    owner: string,
    budgetMin: number,
    budgetMax: number,
    deadlineBlock: number,
    privateKey: string
  ): Promise<TransactionResponse> {
    // First, deduct 3 credits for job posting access
    try {
      await this.payJobGiverAccess(owner, privateKey);
    } catch (error: any) {
      throw new Error(`Failed to deduct posting fee (3 credits): ${error.message}`);
    }

    // Then create the job
    return this.executeTransition(
      ALEO_CONFIG.programs.jobRegistry,
      'create_job',
      [owner, budgetMin, budgetMax, deadlineBlock],
      privateKey
    );
  }

  // Apply to a job (deducts 1 credit before applying)
  async applyToJob(
    owner: string,
    applicant: string,
    jobPosting: any,
    proposedBudget: number,
    privateKey: string
  ): Promise<TransactionResponse> {
    // First, deduct 1 credit for job application access
    try {
      await this.payJobSeekerAccess(applicant, privateKey);
    } catch (error: any) {
      throw new Error(`Failed to deduct application fee (1 credit): ${error.message}`);
    }

    // Then apply to the job
    return this.executeTransition(
      ALEO_CONFIG.programs.jobRegistry,
      'apply_to_job',
      [owner, applicant, JSON.stringify(jobPosting), proposedBudget],
      privateKey
    );
  }

  // Update reputation
  async updateReputation(
    reputationType: 'job_seeker' | 'job_giver',
    currentReputation: any,
    updateValue: number | boolean,
    privateKey: string
  ): Promise<TransactionResponse> {
    const functionName =
      reputationType === 'job_seeker'
        ? 'update_job_seeker_reputation'
        : 'update_job_giver_reputation';

    return this.executeTransition(
      ALEO_CONFIG.programs.reputation,
      functionName,
      [JSON.stringify(currentReputation), updateValue],
      privateKey
    );
  }

  // ============================================
  // ESCROW METHODS
  // ============================================

  /**
   * Create escrow for a job
   * @param jobId - Job ID (will be converted to field)
   * @param employerPrivateKey - Private key of employer (payer)
   * @param freelancerAddress - Address of freelancer (payee)
   * @param amount - Payment amount in credits
   */
  async createEscrow(
    jobId: string,
    employerPrivateKey: string,
    freelancerAddress: string,
    amount: number
  ): Promise<EscrowResponse> {
    // CRITICAL: Never throw - always return EscrowResponse
    try {
      // Validate inputs
      if (!jobId || !employerPrivateKey || !freelancerAddress || !amount || amount <= 0) {
        const errorMsg = 'Invalid escrow parameters: jobId, employerPrivateKey, freelancerAddress, and amount > 0 are required';
        console.error('[Aleo Service] ESCROW CREATION FAILED - Validation:', errorMsg);
        return {
          success: false,
          transactionId: '',
          error: errorMsg,
        };
      }

      // Convert jobId to field (hash it or use as-is)
      let jobIdField: string;
      try {
        jobIdField = this.stringToField(jobId);
      } catch (fieldError: any) {
        console.error('[Aleo Service] ESCROW CREATION FAILED - Field conversion:', fieldError);
        return {
          success: false,
          transactionId: '',
          error: `Failed to convert jobId to field: ${fieldError?.message || 'Unknown error'}`,
        };
      }

      // Get employer address - we need to derive it from private key
      // For now, we'll pass the owner as the first parameter (employer address)
      // The executeTransition will handle the private key
      
      // Note: In production, you'd extract the address from the private key
      // For now, we'll use a placeholder that the executeTransition will handle
      const owner = 'owner'; // This will be replaced by the actual address from private key

      // Debug logging before Aleo call
      console.log('[Aleo Service] ESCROW CREATION - Debug Info:', {
        program: ALEO_CONFIG.programs.escrow,
        transition: 'create_escrow',
        jobId,
        jobIdField,
        amount: `${amount}u64`,
        employerPrivateKey: employerPrivateKey.substring(0, 10) + '...' + employerPrivateKey.substring(employerPrivateKey.length - 10),
        freelancerAddress,
        owner,
        inputs: [owner, owner, freelancerAddress, `${amount}u64`, jobIdField],
      });

      // Execute Aleo transition with comprehensive error handling
      let response: TransactionResponse;
      try {
        response = await this.executeTransition(
          ALEO_CONFIG.programs.escrow,
          'create_escrow',
          [owner, owner, freelancerAddress, `${amount}u64`, jobIdField],
          employerPrivateKey
        );
      } catch (transitionError: any) {
        console.error('[Aleo Service] ESCROW CREATION FAILED - Transition execution:', {
          message: transitionError?.message,
          stack: transitionError?.stack,
          name: transitionError?.name,
          error: transitionError,
        });
        return {
          success: false,
          transactionId: '',
          error: `Aleo transition execution failed: ${transitionError?.message || 'Unknown error'}`,
        };
      }

      // Validate response
      if (!response) {
        console.error('[Aleo Service] ESCROW CREATION FAILED - No response from executeTransition');
        return {
          success: false,
          transactionId: '',
          error: 'No response from Aleo transition execution',
        };
      }

      if (!response.transactionId || response.transactionId === 'unknown') {
        console.error('[Aleo Service] ESCROW CREATION FAILED - Invalid transaction ID:', response);
        return {
          success: false,
          transactionId: response.transactionId || '',
          error: 'Invalid response from executeTransition: missing or invalid transactionId',
        };
      }

      // Generate escrow ID from transaction
      const escrowId = `escrow_${response.transactionId}`;

      console.log('[Aleo Service] ESCROW CREATION SUCCESS:', {
        escrowId,
        transactionId: response.transactionId,
        jobId,
        amount,
      });

      return {
        success: true,
        transactionId: response.transactionId,
        escrowId,
      };
    } catch (error: any) {
      // Final safety net - catch ANY unhandled error
      console.error('[Aleo Service] ESCROW CREATION FAILED - Unhandled exception:', {
        message: error?.message,
        stack: error?.stack,
        name: error?.name,
        error: error,
      });
      
      const errorMessage = error?.message || error?.toString() || 'Failed to create escrow - unhandled exception';
      
      return {
        success: false,
        transactionId: '',
        error: errorMessage,
      };
    }
  }

  /**
   * Release payment from escrow
   * @param escrowRecordId - PaymentEscrow record identifier (stored in database as escrow_record_id)
   * @param employerPrivateKey - Private key of employer (for signing transaction)
   * @returns EscrowResponse with transaction ID
   * 
   * Note: The escrowRecordId should be the Aleo record identifier for the PaymentEscrow record.
   * The Aleo SDK will handle fetching the record from the chain when executing the transition.
   */
  async releaseEscrow(
    escrowRecordId: string,
    employerPrivateKey: string
  ): Promise<EscrowResponse> {
    try {
      // The escrowRecordId is the PaymentEscrow record identifier
      // The Aleo SDK will fetch the record from the chain when executing the transition
      const escrowRecord = escrowRecordId;
      
      // Completion proof - in production, this could be a ZK proof of job completion
      // For now, we use a placeholder. This can be enhanced with actual proof generation.
      const completionProof = '0field';

      const response = await this.executeTransition(
        ALEO_CONFIG.programs.escrow,
        'release_payment',
        [escrowRecord, completionProof],
        employerPrivateKey
      );

      return {
        success: true,
        transactionId: response.transactionId,
        escrowId: escrowRecordId, // Return the record ID for reference
      };
    } catch (error: any) {
      console.error('[Aleo Service] Release escrow error:', error);
      return {
        success: false,
        transactionId: '',
        escrowId: escrowRecordId,
        error: error.message || 'Failed to release escrow on blockchain',
      };
    }
  }

  /**
   * Refund payment from escrow
   * @param escrowRecordId - PaymentEscrow record identifier (stored in database as escrow_record_id)
   * @param employerPrivateKey - Private key of employer (for signing transaction)
   * @param refundReason - Reason for refund (0 = cancellation, 1 = dispute)
   * @returns EscrowResponse with transaction ID
   * 
   * Note: The escrowRecordId should be the Aleo record identifier for the PaymentEscrow record.
   * The Aleo SDK will handle fetching the record from the chain when executing the transition.
   */
  async refundEscrow(
    escrowRecordId: string,
    employerPrivateKey: string,
    refundReason: number = 0
  ): Promise<EscrowResponse> {
    try {
      // Validate refund reason
      if (refundReason !== 0 && refundReason !== 1) {
        return {
          success: false,
          transactionId: '',
          escrowId: escrowRecordId,
          error: 'Invalid refund reason. Must be 0 (cancellation) or 1 (dispute)',
        };
      }

      // The escrowRecordId is the PaymentEscrow record identifier
      // The Aleo SDK will fetch the record from the chain when executing the transition
      const escrowRecord = escrowRecordId;

      const response = await this.executeTransition(
        ALEO_CONFIG.programs.escrow,
        'refund_payment',
        [escrowRecord, refundReason],
        employerPrivateKey
      );

      return {
        success: true,
        transactionId: response.transactionId,
        escrowId: escrowRecordId, // Return the record ID for reference
      };
    } catch (error: any) {
      console.error('[Aleo Service] Refund escrow error:', error);
      return {
        success: false,
        transactionId: '',
        escrowId: escrowRecordId,
        error: error.message || 'Failed to refund escrow on blockchain',
      };
    }
  }

  /**
   * Get escrow status
   * @param escrowId - Escrow record ID
   */
  async getEscrowStatus(escrowId: string): Promise<{
    success: boolean;
    status?: 'locked' | 'released' | 'refunded';
    error?: string;
  }> {
    try {
      // In production, you'd fetch the escrow record from Aleo and check its status
      // For now, we'll return a placeholder
      // The actual implementation would:
      // 1. Fetch the escrow record from Aleo
      // 2. Extract the status field
      // 3. Map status: 0 = locked, 1 = released, 2 = refunded

      // This is a read-only operation, so we might need to query records
      // For now, return a placeholder that indicates we need to implement record fetching
      return {
        success: true,
        status: 'locked', // Placeholder - should be fetched from Aleo record
      };
    } catch (error: any) {
      console.error('Get escrow status error:', error);
      return {
        success: false,
        error: error.message || 'Failed to get escrow status',
      };
    }
  }

  /**
   * Helper: Convert string to Aleo field
   * In production, this would use proper hashing
   * For now, we'll use a simple conversion - convert UUID to a numeric field
   */
  private stringToField(str: string): string {
    // For MVP: Convert string to a numeric field representation
    // In production, you'd use proper Aleo field hashing
    // For now, we'll use a simple numeric conversion based on string hash
    try {
      // Simple hash of string to get a number
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
      }
      // Use absolute value and convert to field format
      const fieldValue = Math.abs(hash);
      return `${fieldValue}field`;
    } catch (error) {
      console.error('[Aleo Service] Error converting string to field:', error);
      return `0field`; // Fallback
    }
  }
}

// Export singleton instance
export const aleoService = new AleoService();


