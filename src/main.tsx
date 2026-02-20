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

const PROGRAM_ID_PATTERN = /^[a-z][a-z0-9_]{0,62}\.aleo$/;

const DEPLOYED_PROGRAM_IDS = Array.from(
    new Set([
        import.meta.env.NEXT_PUBLIC_ACCESS_CONTROL_PROGRAM_ID,
        import.meta.env.NEXT_PUBLIC_REPUTATION_PROGRAM_ID,
        import.meta.env.NEXT_PUBLIC_JOB_REGISTRY_PROGRAM_ID,
        import.meta.env.NEXT_PUBLIC_ESCROW_PROGRAM_ID,
        import.meta.env.NEXT_PUBLIC_ALEO_ACCESS_CONTROL_PROGRAM,
        import.meta.env.NEXT_PUBLIC_ALEO_REPUTATION_PROGRAM,
        import.meta.env.NEXT_PUBLIC_ALEO_JOB_REGISTRY_PROGRAM,
        import.meta.env.NEXT_PUBLIC_ALEO_ESCROW_PROGRAM,
        'access_control_v3.aleo',
        'job_registry_v3.aleo',
        'reputation_v3.aleo',
        'escrow_v4.aleo',
        'job_marketplace_escrow_engine.aleo',
    ]),
).filter((programId): programId is string => {
    return typeof programId === 'string' && PROGRAM_ID_PATTERN.test(programId);
});

// Puzzle is stricter on connect permissions, so keep connect-time permissions optional.
// Default is enabled because escrow release depends on record access for escrow_v4.aleo.
// Set VITE_REQUEST_PROGRAM_PERMISSIONS_ON_CONNECT=false to disable connect-time program prompts.
const REQUEST_PROGRAM_PERMISSIONS_ON_CONNECT =
    import.meta.env.VITE_REQUEST_PROGRAM_PERMISSIONS_ON_CONNECT !== 'false';
const PROGRAMS = REQUEST_PROGRAM_PERMISSIONS_ON_CONNECT ? DEPLOYED_PROGRAM_IDS : [];

const PUZZLE_APP_ICON_URL =
    typeof window === 'undefined' ? undefined : `${window.location.origin}/favicon.ico`;

// Initialize wallet adapters - order matters (first is default)
const wallets = [
    new PuzzleWalletAdapter({
        appName: 'AleoJob Marketplace',
        appDescription: 'Private jobs and escrow on Aleo',
        appIconUrl: PUZZLE_APP_ICON_URL,
    }),
    new LeoWalletAdapter(),
    new FoxWalletAdapter(),
];

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <ThemeProvider>
                <AleoWalletProvider
                    wallets={wallets}
                    autoConnect={false}
                    network={Network.TESTNET3}
                    decryptPermission={DecryptPermission.UponRequest}
                    programs={PROGRAMS}
                    onError={(error) => {
                        console.error('Wallet connection error:', error);
                        const isOutdatedPuzzleExtension =
                            /connect\.mutate not found|puzzleWalletClient/i.test(error.message);
                        alert(
                            `Wallet connection failed: ${error.message}\n\nPlease make sure:\n1. Puzzle Wallet is unlocked\n2. You approve the popup request\n3. The extension has permission for this site\n4. You are using Aleo Testnet in wallet settings\n${isOutdatedPuzzleExtension ? '5. Update Puzzle Wallet extension to the latest version\n' : ''}\nIf it still fails, refresh and reconnect.`,
                        );
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
