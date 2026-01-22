// Aleo Integration Helper
// Replaces mock functions with real Aleo blockchain calls

import { aleoClient, ALEO_CREDITS } from './aleo-client';
import { generatePseudonym } from './utils';

// Replace mock wallet connection with real API call
export async function connectWallet(): Promise<{
  address: string;
  privateKey: string;
  viewKey: string;
}> {
  try {
    // Get wallet configuration from API
    const config = await aleoClient.getWalletConfig();
    
    // In production: This should come from wallet extension or user input
    // For now: Use environment variables or user-provided keys
    return {
      address: process.env.NEXT_PUBLIC_ALEO_ADDRESS || 'aleo1xwnxpweqy9ktwj65sj3gg3qwpgxd0q0axnqljsgxcz8kw37nqvzqzx4etk',
      privateKey: process.env.NEXT_PUBLIC_ALEO_PRIVATE_KEY || 'APrivateKey1zkp8xH3uujgA4phUNeeRZfk31JzYuJkTUZbbvPjs2rijjYV',
      viewKey: process.env.NEXT_PUBLIC_ALEO_VIEW_KEY || 'AViewKey1ibX6w3zp7b2Qiq9xPrJvupxZSAQdHFXsjWzMC3pSf6sS',
    };
  } catch (error) {
    console.error('Wallet connection error:', error);
    throw error;
  }
}

// Real payment for Job Seeker access
export async function payJobSeekerAccess(privateKey: string, recipient: string): Promise<{
  success: boolean;
  transactionHash?: string;
  accessRecord?: AccessRecord;
}> {
  try {
    const result = await aleoClient.payJobSeekerAccess(recipient, privateKey);
    
    if (result.success && result.transaction) {
      const now = Date.now();
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

      return {
        success: true,
        transactionHash: result.transaction.id,
        accessRecord: {
          startDate: now,
          expiryDate: now + sevenDaysMs,
          isValid: true,
        },
      };
    }

    throw new Error(result.error || 'Payment failed');
  } catch (error: any) {
    console.error('Payment error:', error);
    throw new Error(`Payment failed: ${error.message}`);
  }
}

// Real payment for Job Giver access
export async function payJobGiverAccess(privateKey: string, recipient: string): Promise<{
  success: boolean;
  transactionHash?: string;
  accessRecord?: AccessRecord;
}> {
  try {
    const result = await aleoClient.payJobGiverAccess(recipient, privateKey);
    
    if (result.success && result.transaction) {
      const now = Date.now();
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

      return {
        success: true,
        transactionHash: result.transaction.id,
        accessRecord: {
          startDate: now,
          expiryDate: now + sevenDaysMs,
          isValid: true,
        },
      };
    }

    throw new Error(result.error || 'Payment failed');
  } catch (error: any) {
    console.error('Payment error:', error);
    throw new Error(`Payment failed: ${error.message}`);
  }
}

// Check if access is valid (from blockchain records)
export async function isAccessValid(address: string, expiryDate: number): Promise<boolean> {
  // Check blockchain for access record
  try {
    const records = await aleoClient.getRecords(address, 'access_control.aleo');
    // Check if access record exists and is valid
    return Date.now() < expiryDate && records.length > 0;
  } catch (error) {
    // Fallback to date check
    return Date.now() < expiryDate;
  }
}

// Export AccessRecord type
export interface AccessRecord {
  startDate: number;
  expiryDate: number;
  isValid: boolean;
}

// Keep ALEO_CREDITS export
export { ALEO_CREDITS };

// Testnet API endpoint
export const ALEO_TESTNET_API = 'https://api.explorer.provable.com/v2/testnet';






