// Aleo Client for Frontend
// Client-side utilities for calling Aleo API routes

import { ALEO_CONFIG, ALEO_CREDITS } from './aleo-config';

export interface AccessRecord {
  startDate: number;
  expiryDate: number;
  isValid: boolean;
}

export interface TransactionResponse {
  success: boolean;
  transaction?: {
    id: string;
    status: string;
  };
  message?: string;
  error?: string;
}

// Client-side Aleo API client
class AleoClient {
  private apiBase: string;

  constructor() {
    // Use relative path for API routes
    this.apiBase = '/api/aleo';
  }

  // Connect wallet / Get configuration
  async getWalletConfig() {
    const response = await fetch(`${this.apiBase}/wallet/connect`);
    return response.json();
  }

  // Get wallet balance
  async getBalance(address: string): Promise<{ balance: number; address?: string; unit?: string }> {
    const url = `${this.apiBase}/wallet/balance?address=${encodeURIComponent(address)}`;
    console.log('🔍 Fetching balance from:', url);
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      console.log('📡 Balance API Response Status:', response.status, response.statusText);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Balance API Error:', errorText);
        throw new Error(`Failed to get balance: ${response.statusText} - ${errorText}`);
      }
      
      const data = await response.json();
      console.log('✅ Balance API Response Data:', data);
      
      // Handle both formats: { balance: number } or { balance: number, address, unit }
      return {
        balance: typeof data.balance === 'number' ? data.balance : parseFloat(data.balance) || 0,
        address: data.address,
        unit: data.unit || 'credits',
      };
    } catch (error: any) {
      console.error('🚨 Balance fetch error:', error);
      throw error;
    }
  }

  // Pay for job seeker access
  async payJobSeekerAccess(recipient: string, privateKey: string): Promise<TransactionResponse> {
    const response = await fetch(`${this.apiBase}/access/pay-job-seeker`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ recipient, privateKey }),
    });
    return response.json();
  }

  // Pay for job giver access
  async payJobGiverAccess(recipient: string, privateKey: string): Promise<TransactionResponse> {
    const response = await fetch(`${this.apiBase}/access/pay-job-giver`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ recipient, privateKey }),
    });
    return response.json();
  }

  // Get records for an address
  async getRecords(address: string, programId?: string) {
    const params = new URLSearchParams({ address });
    if (programId) {
      params.append('programId', programId);
    }
    const response = await fetch(`${this.apiBase}/records/get?${params}`);
    return response.json();
  }

  // Create a job
  async createJob(
    owner: string,
    budgetMin: number,
    budgetMax: number,
    deadlineBlock: number,
    privateKey: string
  ): Promise<TransactionResponse> {
    const response = await fetch(`${this.apiBase}/jobs/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        owner,
        budgetMin,
        budgetMax,
        deadlineBlock,
        privateKey,
      }),
    });
    return response.json();
  }

  // Apply to a job
  async applyToJob(
    owner: string,
    applicant: string,
    jobPosting: any,
    proposedBudget: number,
    privateKey: string
  ): Promise<TransactionResponse> {
    const response = await fetch(`${this.apiBase}/jobs/apply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        owner,
        applicant,
        jobPosting,
        proposedBudget,
        privateKey,
      }),
    });
    return response.json();
  }

  // Get transaction status
  async getTransactionStatus(transactionId: string) {
    const response = await fetch(
      `${this.apiBase}/transaction/status?transactionId=${encodeURIComponent(transactionId)}`
    );
    return response.json();
  }

  // ============================================
  // ESCROW METHODS
  // ============================================

  // Create escrow
  async createEscrow(
    jobId: string,
    employerPrivateKey: string,
    freelancerAddress: string,
    amount: number,
    aleoAddress: string
  ): Promise<TransactionResponse> {
    const response = await fetch(`${this.apiBase}/escrow/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jobId,
        employerPrivateKey,
        freelancerAddress,
        amount,
        aleoAddress,
      }),
    });
    return response.json();
  }

  // Release escrow
  async releaseEscrow(
    escrowId: string,
    employerPrivateKey: string,
    aleoAddress: string
  ): Promise<TransactionResponse> {
    const response = await fetch(`${this.apiBase}/escrow/release`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        escrowId,
        employerPrivateKey,
        aleoAddress,
      }),
    });
    return response.json();
  }

  // Refund escrow
  async refundEscrow(
    escrowId: string,
    employerPrivateKey: string,
    aleoAddress: string,
    refundReason: number = 0
  ): Promise<TransactionResponse> {
    const response = await fetch(`${this.apiBase}/escrow/refund`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        escrowId,
        employerPrivateKey,
        aleoAddress,
        refundReason,
      }),
    });
    return response.json();
  }

  // Get escrow status
  async getEscrowStatus(escrowId?: string, jobId?: string) {
    const params = new URLSearchParams();
    if (escrowId) params.append('escrowId', escrowId);
    if (jobId) params.append('jobId', jobId);
    const response = await fetch(`${this.apiBase}/escrow/status?${params}`);
    return response.json();
  }
}

// Export singleton instance
export const aleoClient = new AleoClient();

// Export credits constant
export { ALEO_CREDITS };


