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
    () => [
      new ShieldWalletAdapter(),
      new PuzzleWalletAdapter(),
      new LeoWalletAdapter(),
      new FoxWalletAdapter(),
    ],
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
      autoConnect={true}
      network={Network.TESTNET3}
      decryptPermission={DecryptPermission.UponRequest}
      programs={programs}
      onError={(error) => console.error('Wallet error:', error.message)}
    >
      <WalletModalProvider>{children}</WalletModalProvider>
    </AleoWalletProvider>
  );
}
