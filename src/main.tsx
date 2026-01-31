import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { ThemeProvider } from './contexts/ThemeContext';
import ErrorBoundary from './components/ErrorBoundary';
import './styles/index.css';

// Aleo wallet adapter (ProvableHQ multi-wallet)
import { AleoWalletProvider } from '@provablehq/aleo-wallet-adaptor-react';
import { WalletModalProvider } from '@provablehq/aleo-wallet-adaptor-react-ui';
import '@provablehq/aleo-wallet-adaptor-react-ui/dist/styles.css';
import { PuzzleWalletAdapter } from '@provablehq/aleo-wallet-adaptor-puzzle';
import { LeoWalletAdapter } from '@provablehq/aleo-wallet-adaptor-leo';
import { ShieldWalletAdapter } from '@provablehq/aleo-wallet-adaptor-shield';
import { FoxWalletAdapter } from '@provablehq/aleo-wallet-adaptor-fox';
import { Network } from '@provablehq/aleo-types';
import { DecryptPermission } from '@provablehq/aleo-wallet-adaptor-core';

// Program IDs - using deployed contracts
const PROGRAMS = [
  'access_control.aleo',
  'reputation.aleo',
  'job_registry.aleo',
  'job_marketplace_escrow_engine.aleo',
];

// Initialize wallet adapters with error handling
let wallets: (ShieldWalletAdapter | PuzzleWalletAdapter | LeoWalletAdapter | FoxWalletAdapter)[] = [];
try {
  wallets = [
    new ShieldWalletAdapter(),
    new PuzzleWalletAdapter(),
    new LeoWalletAdapter(),
    new FoxWalletAdapter(),
  ];
  console.log('✅ Wallet adapters initialized successfully');
} catch (error) {
  console.error('❌ Failed to initialize wallet adapters:', error);
  // Continue with empty wallets array - app will still work but wallet features won't be available
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

// Check for critical environment variables
const missingEnvVars: string[] = [];
if (!import.meta.env.NEXT_PUBLIC_SUPABASE_URL) {
  missingEnvVars.push('NEXT_PUBLIC_SUPABASE_URL');
}
if (!import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  missingEnvVars.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

if (missingEnvVars.length > 0) {
  console.error('⚠️ Missing environment variables:', missingEnvVars.join(', '));
  console.error('Please set these in Vercel project settings > Environment Variables');
}

// Add error handler for unhandled errors
window.addEventListener('error', (event) => {
  console.error('Unhandled error:', event.error);
  console.error('Error details:', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error
  });
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});

try {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <ErrorBoundary>
        <BrowserRouter>
          <ThemeProvider>
            <AleoWalletProvider
              wallets={wallets}
              autoConnect={true}
              network={Network.TESTNET3}
              decryptPermission={DecryptPermission.UponRequest}
              programs={PROGRAMS}
              onError={(error) => {
                console.error('Wallet error:', error);
                // Don't crash the app on wallet errors
              }}
            >
              <WalletModalProvider>
                <App />
              </WalletModalProvider>
            </AleoWalletProvider>
          </ThemeProvider>
        </BrowserRouter>
      </ErrorBoundary>
    </React.StrictMode>
  );
} catch (error) {
  console.error('Failed to render app:', error);
  rootElement.innerHTML = `
    <div style="padding: 20px; color: white; background: #1e293b; min-height: 100vh; font-family: sans-serif;">
      <h1>Application Error</h1>
      <p>Failed to start the application. Please check the console for details.</p>
      <pre style="background: #0f172a; padding: 10px; border-radius: 5px; overflow: auto;">${error instanceof Error ? error.message : String(error)}</pre>
    </div>
  `;
}
