// Aleo Service Layer
// Handles all Aleo blockchain interactions

import { ALEO_CONFIG, ALEO_CREDITS } from './aleo-config';
import { AleoNetworkClient } from '@provablehq/sdk/testnet.js';

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
  async executeTransition(
    programId: string,
    functionName: string,
    inputs: any[],
    privateKey: string,
    fee?: number
  ): Promise<TransactionResponse> {
    try {
      const client = await this.getClient();
      // Provable SDK handles serialization and submission internally.
      const txId = await (client as any).executeProgram(
        programId,
        functionName,
        inputs,
        privateKey,
        fee ?? 0
      );

      return {
        transactionId: typeof txId === 'string' ? txId : txId?.id || 'unknown',
        status: 'pending',
      };
    } catch (error: any) {
      console.error('Transition execution error:', error);
      throw new Error(`Failed to execute transition: ${error.message}`);
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
}

// Export singleton instance
export const aleoService = new AleoService();


