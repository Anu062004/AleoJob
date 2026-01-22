import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

// Types for wallet context
interface TransactionParams {
    programId: string;
    functionName: string;
    inputs: string[];
    fee?: number;
}

interface TransactionResult {
    transactionId?: string;
    error?: string;
}

interface WalletContextType {
    // Connection state
    connected: boolean;
    connecting: boolean;
    address: string | null;
    walletName: string | null;

    // Available wallets
    wallets: WalletInfo[];

    // Actions
    connectWallet: (walletType: string) => Promise<void>;
    disconnectWallet: () => Promise<void>;

    // Wallet operations
    createTransaction: (params: TransactionParams) => Promise<TransactionResult>;
    signMessage: (message: string) => Promise<string | null>;
    decryptMessage: (ciphertext: string) => Promise<string | null>;
    getRecords: (programId: string) => Promise<any[]>;

    // Error handling
    error: string | null;
    clearError: () => void;
}

interface WalletInfo {
    name: string;
    icon: string;
    installed: boolean;
    installUrl?: string;
}

const WalletContext = createContext<WalletContextType | null>(null);

interface WalletProviderProps {
    children: ReactNode;
}

export function WalletProvider({ children }: WalletProviderProps) {
    const [connected, setConnected] = useState(false);
    const [connecting, setConnecting] = useState(false);
    const [address, setAddress] = useState<string | null>(null);
    const [walletName, setWalletName] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Available wallets (check if installed)
    const wallets: WalletInfo[] = [
        {
            name: 'Leo Wallet',
            icon: '🦁',
            installed: typeof window !== 'undefined' && !!(window as any).leoWallet,
            installUrl: 'https://leo.app',
        },
        {
            name: 'Puzzle Wallet',
            icon: '🧩',
            installed: typeof window !== 'undefined' && !!(window as any).puzzle,
            installUrl: 'https://www.puzzle.xyz/',
        },
    ];

    // Connect to wallet
    const connectWallet = useCallback(async (walletType: string) => {
        try {
            setConnecting(true);
            setError(null);

            // Try to connect based on wallet type
            if (walletType.toLowerCase().includes('leo')) {
                const leoWallet = (window as any).leoWallet;
                if (!leoWallet) {
                    throw new Error('Leo Wallet not installed. Please install from leo.app');
                }

                const result = await leoWallet.connect();
                if (result) {
                    setAddress(result);
                    setWalletName('Leo Wallet');
                    setConnected(true);
                }
            } else if (walletType.toLowerCase().includes('puzzle')) {
                const puzzleWallet = (window as any).puzzle;
                if (!puzzleWallet) {
                    throw new Error('Puzzle Wallet not installed');
                }

                const result = await puzzleWallet.connect();
                if (result) {
                    setAddress(result);
                    setWalletName('Puzzle Wallet');
                    setConnected(true);
                }
            } else {
                throw new Error(`Unknown wallet type: ${walletType}`);
            }
        } catch (err: any) {
            console.error('Wallet connection error:', err);
            setError(err.message || 'Failed to connect wallet');
            setConnected(false);
        } finally {
            setConnecting(false);
        }
    }, []);

    // Disconnect wallet
    const disconnectWallet = useCallback(async () => {
        setConnected(false);
        setAddress(null);
        setWalletName(null);
    }, []);

    // Create transaction (placeholder)
    const createTransaction = useCallback(async (_params: TransactionParams): Promise<TransactionResult> => {
        if (!connected) {
            return { error: 'Wallet not connected' };
        }
        // TODO: Implement with actual wallet adapter
        return { error: 'Not implemented' };
    }, [connected]);

    // Sign message (placeholder)
    const signMessage = useCallback(async (_message: string): Promise<string | null> => {
        if (!connected) {
            setError('Wallet not connected');
            return null;
        }
        // TODO: Implement with actual wallet adapter
        return null;
    }, [connected]);

    // Decrypt message (placeholder)
    const decryptMessage = useCallback(async (_ciphertext: string): Promise<string | null> => {
        if (!connected) {
            setError('Wallet not connected');
            return null;
        }
        // TODO: Implement with actual wallet adapter
        return null;
    }, [connected]);

    // Get records (placeholder)
    const getRecords = useCallback(async (_programId: string): Promise<any[]> => {
        if (!connected) {
            setError('Wallet not connected');
            return [];
        }
        // TODO: Implement with actual wallet adapter
        return [];
    }, [connected]);

    // Clear error
    const clearError = useCallback(() => {
        setError(null);
    }, []);

    const value: WalletContextType = {
        connected,
        connecting,
        address,
        walletName,
        wallets,
        connectWallet,
        disconnectWallet,
        createTransaction,
        signMessage,
        decryptMessage,
        getRecords,
        error,
        clearError,
    };

    return (
        <WalletContext.Provider value={value}>
            {children}
        </WalletContext.Provider>
    );
}

export function useWallet() {
    const context = useContext(WalletContext);
    if (!context) {
        throw new Error('useWallet must be used within a WalletProvider');
    }
    return context;
}
