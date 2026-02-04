import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { ThemeProvider } from './contexts/ThemeContext';
import './styles/index.css';

// Aleo wallet adapter (ProvableHQ multi-wallet)
import { AleoWalletProvider } from '@provablehq/aleo-wallet-adaptor-react';
import { WalletModalProvider } from '@provablehq/aleo-wallet-adaptor-react-ui';
import '@provablehq/aleo-wallet-adaptor-react-ui/dist/styles.css';
import { PuzzleWalletAdapter } from '@provablehq/aleo-wallet-adaptor-puzzle';
import { LeoWalletAdapter } from '@provablehq/aleo-wallet-adaptor-leo';
import { FoxWalletAdapter } from '@provablehq/aleo-wallet-adaptor-fox';
import { Network } from '@provablehq/aleo-types';
import { DecryptPermission } from '@provablehq/aleo-wallet-adaptor-core';

// Program IDs - using deployed contracts
const PROGRAMS = [
    'job_marketplace_escrow_engine.aleo',
];

// Initialize wallet adapters - order matters (first is default)
const wallets = [
    new PuzzleWalletAdapter(), // Try Puzzle first - more stable
    new LeoWalletAdapter(),
    new FoxWalletAdapter(),
];

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <BrowserRouter>
            <ThemeProvider>
                <AleoWalletProvider
                    wallets={wallets}
                    autoConnect={false}
                    network={Network.TESTNET3}
                    decryptPermission={DecryptPermission.AutoDecrypt}
                    programs={PROGRAMS}
                    onError={(error) => {
                        console.error('Wallet connection error:', error);
                        alert(`Wallet connection failed: ${error.message}\n\nPlease make sure:\n1. Your wallet is unlocked\n2. You're on Testnet Beta\n3. You approve the connection request\n\nTry refreshing the page and connecting again.`);
                    }}
                >
                    <WalletModalProvider>
                        <App />
                    </WalletModalProvider>
                </AleoWalletProvider>
            </ThemeProvider>
        </BrowserRouter>
    </React.StrictMode>
);
