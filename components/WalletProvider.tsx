'use client';

import React, { useMemo, ReactNode } from 'react';
import { AleoWalletProvider } from '@provablehq/aleo-wallet-adaptor-react';
import { WalletModalProvider } from '@provablehq/aleo-wallet-adaptor-react-ui';
import { PuzzleWalletAdapter } from '@provablehq/aleo-wallet-adaptor-puzzle';
import { LeoWalletAdapter } from '@provablehq/aleo-wallet-adaptor-leo';
import { ShieldWalletAdapter } from '@provablehq/aleo-wallet-adaptor-shield';
import { FoxWalletAdapter } from '@provablehq/aleo-wallet-adaptor-fox';
import { Network } from '@provablehq/aleo-types';
import { DecryptPermission } from '@provablehq/aleo-wallet-adaptor-core';
import { ALEO_CONFIG } from '@/lib/aleo-config';
// Import wallet adapter styles
import '@provablehq/aleo-wallet-adaptor-react-ui/dist/styles.css';

interface WalletProviderProps {
  children: ReactNode;
}

export function WalletProvider({ children }: WalletProviderProps) {
  const wallets = useMemo(
    () => {
      const walletAdapters = [];
      
      // Initialize wallet adapters - they should handle their own availability checks
      // The order matters - most commonly used wallets first
      try {
        walletAdapters.push(new LeoWalletAdapter());
      } catch (e) {
        console.warn('LeoWalletAdapter initialization failed:', e);
      }
      
      try {
        walletAdapters.push(new PuzzleWalletAdapter());
      } catch (e) {
        console.warn('PuzzleWalletAdapter initialization failed:', e);
      }
      
      try {
        walletAdapters.push(new ShieldWalletAdapter());
      } catch (e) {
        console.warn('ShieldWalletAdapter initialization failed:', e);
      }
      
      try {
        walletAdapters.push(new FoxWalletAdapter());
      } catch (e) {
        console.warn('FoxWalletAdapter initialization failed:', e);
      }
      
      if (walletAdapters.length === 0) {
        console.error('No wallet adapters could be initialized');
      } else {
        console.log(`Initialized ${walletAdapters.length} wallet adapter(s)`);
      }
      
      return walletAdapters;
    },
    []
  );

  // Get deployed program IDs from config
  const programs = useMemo(
    () => [
      ALEO_CONFIG.programs.accessControl,
      ALEO_CONFIG.programs.reputation,
      ALEO_CONFIG.programs.jobRegistry,
      ALEO_CONFIG.programs.escrow,
    ],
    []
  );

  return (
    <AleoWalletProvider
      wallets={wallets}
      autoConnect={false}
      network={Network.TESTNET3}
      decryptPermission={DecryptPermission.UponRequest}
      programs={programs}
      onError={(error) => {
        console.error('Wallet error:', error);
        // Log more details for debugging
        if (error instanceof Error) {
          console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            name: error.name,
          });
        }
        // Check for specific connection errors
        if (error && typeof error === 'object' && 'message' in error) {
          const errorMessage = String(error.message);
          if (errorMessage.includes('No address returned') || errorMessage.includes('WalletConnectionError')) {
            console.error('Wallet connection failed - wallet may not be installed or may need user approval');
            console.error('Available wallets:', wallets.map(w => w.name));
          }
        }
      }}
    >
      <WalletModalProvider>{children}</WalletModalProvider>
    </AleoWalletProvider>
  );
}
