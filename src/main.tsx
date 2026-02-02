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
  // Show error immediately if root element is missing
  document.body.innerHTML = `
    <div style="padding: 20px; color: white; background: #1e293b; min-height: 100vh; font-family: sans-serif; display: flex; align-items: center; justify-content: center;">
      <div style="text-align: center;">
        <h1 style="font-size: 24px; margin-bottom: 16px;">Application Error</h1>
        <p>Root element not found. Please check the HTML structure.</p>
      </div>
    </div>
  `;
  throw new Error('Root element not found');
}

// Show loading state immediately
rootElement.innerHTML = `
  <div style="padding: 20px; color: white; background: #1e293b; min-height: 100vh; font-family: sans-serif; display: flex; align-items: center; justify-content: center;">
    <div style="text-align: center;">
      <div style="font-size: 18px; margin-bottom: 16px;">Loading AleoJob...</div>
      <div style="width: 40px; height: 40px; border: 4px solid #334155; border-top-color: #8b5cf6; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto;"></div>
    </div>
  </div>
  <style>
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  </style>
`;

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

// Show error message helper
const showError = (error: any) => {
  console.error('❌ Application Error:', error);
  rootElement.innerHTML = `
    <div style="padding: 20px; color: white; background: #1e293b; min-height: 100vh; font-family: sans-serif; display: flex; align-items: center; justify-content: center;">
      <div style="max-width: 600px; background: #0f172a; padding: 24px; border-radius: 8px; border: 1px solid #ef4444;">
        <h1 style="font-size: 24px; margin-bottom: 16px; color: #ef4444;">Application Error</h1>
        <p style="margin-bottom: 16px; color: #cbd5e1;">Failed to start the application. Please check the browser console (F12) for details.</p>
        <pre style="background: #1e293b; padding: 12px; border-radius: 4px; overflow: auto; font-size: 12px; color: #f1f5f9; max-height: 200px;">${error instanceof Error ? error.message : String(error)}</pre>
        <button onclick="window.location.reload()" style="margin-top: 16px; padding: 8px 16px; background: #8b5cf6; color: white; border: none; border-radius: 4px; cursor: pointer;">Reload Page</button>
        <p style="margin-top: 16px; font-size: 12px; color: #94a3b8;">Check the browser console (Press F12) for more details.</p>
      </div>
    </div>
  `;
};

// Render the app with better error handling
const renderApp = async () => {
  try {
    console.log('🚀 Starting app render...');
    console.log('📦 Wallet adapters:', wallets.length);
    console.log('🌍 Environment:', {
      hasSupabaseUrl: !!import.meta.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseKey: !!import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      hasBackendUrl: !!import.meta.env.NEXT_PUBLIC_BACKEND_URL,
    });

    console.log('📦 Found root element, starting React render...');

    const root = ReactDOM.createRoot(rootElement);

    // Render with wallet provider if wallets are available, otherwise render without it
    if (wallets.length > 0) {
      console.log('🛡️ Rendering with Aleo Wallet Provider');
      root.render(
        <React.StrictMode>
          <ErrorBoundary>
            <BrowserRouter>
              <ThemeProvider>
                <AleoWalletProvider
                  wallets={wallets}
                  autoConnect={false}
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
    } else {
      // Render without wallet provider if adapters failed
      console.warn('⚠️ Rendering app without wallet adapters');
      root.render(
        <React.StrictMode>
          <ErrorBoundary>
            <BrowserRouter>
              <ThemeProvider>
                <App />
              </ThemeProvider>
            </BrowserRouter>
          </ErrorBoundary>
        </React.StrictMode>
      );
    }

    console.log('✅ React app rendered successfully');
  } catch (error) {
    showError(error);
  }
};

// Set a timeout to show error if app doesn't load
const loadTimeout = setTimeout(() => {
  console.error('⏱️ App load timeout (5s) - checking if React rendered...');
  const rootContent = rootElement.innerHTML;
  if (rootContent.includes('Loading AleoJob')) {
    showError(new Error('Application failed to load within 5 seconds. This usually means a fatal initialization error occurred. Check the browser console (F12) for the specific error.'));
  }
}, 5000);

// Start rendering
renderApp().then(() => {
  clearTimeout(loadTimeout);
  console.log('✅ App initialization complete');
}).catch((error) => {
  clearTimeout(loadTimeout);
  showError(error);
});
