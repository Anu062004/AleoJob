'use client';

import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { WalletMultiButton } from '@provablehq/aleo-wallet-adaptor-react-ui';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { AlertCircle, CheckCircle, XCircle, Wallet } from 'lucide-react';

/**
 * Wallet Debug Component
 * Shows current wallet connection state and helps diagnose issues
 */
export function WalletDebugPanel() {
    const {
        address,
        connected,
        connecting,
        disconnecting,
        wallet,
        wallets
    } = useWallet();

    const handleTestConnection = () => {
        console.log('🔍 Wallet Debug Info:');
        console.log('Connected:', connected);
        console.log('Connecting:', connecting);
        console.log('Disconnecting:', disconnecting);
        console.log('Address:', address);
        console.log('Current Wallet:', wallet);
        console.log('Available Wallets:', wallets);
    };

    return (
        <Card className="p-6 space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-700 pb-4">
                <Wallet className="text-aleo-purple" size={24} />
                <h2 className="text-xl font-bold text-white">Wallet Connection Debugger</h2>
            </div>

            {/* Connection Status */}
            <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-400 uppercase">Connection Status</h3>

                <div className="grid grid-cols-2 gap-3">
                    <StatusItem
                        label="Connected"
                        value={connected}
                        icon={connected ? CheckCircle : XCircle}
                    />
                    <StatusItem
                        label="Connecting"
                        value={connecting}
                        icon={connecting ? AlertCircle : XCircle}
                    />
                    <StatusItem
                        label="Disconnecting"
                        value={disconnecting}
                        icon={disconnecting ? AlertCircle : XCircle}
                    />
                </div>
            </div>

            {/* Wallet Info */}
            <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-400 uppercase">Wallet Information</h3>

                <div className="space-y-2">
                    <InfoRow label="Address" value={address || 'Not connected'} />
                    <InfoRow label="Active Wallet" value={wallet?.name || 'None'} />
                    <InfoRow
                        label="Available Wallets"
                        value={wallets.length > 0 ? wallets.map(w => w.name).join(', ') : 'None detected'}
                    />
                </div>
            </div>

            {/* Leo Wallet Detection */}
            <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-400 uppercase">Leo Wallet Detection</h3>

                <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                    {typeof window !== 'undefined' && (window as any).leoWallet ? (
                        <div className="flex items-center gap-2 text-green-400">
                            <CheckCircle size={20} />
                            <span>Leo Wallet extension detected ✅</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-red-400">
                            <XCircle size={20} />
                            <span>Leo Wallet extension NOT detected ❌</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Actions */}
            <div className="space-y-2 pt-4 border-t border-slate-700">
                <Button
                    onClick={handleTestConnection}
                    variant="primary"
                    className="w-full"
                >
                    Test Connection & Log Debug Info
                </Button>

                <div className="w-full">
                    <WalletMultiButton className="wallet-adapter-button-trigger w-full" />
                </div>
            </div>

            {/* Instructions */}
            <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <p className="text-sm text-blue-300">
                    <strong>💡 Tip:</strong> Click "Test Connection" and check your browser console (F12)
                    for detailed debug information about your wallet connection.
                </p>
            </div>
        </Card>
    );
}

function StatusItem({
    label,
    value,
    icon: Icon
}: {
    label: string;
    value: boolean;
    icon: any;
}) {
    return (
        <div className={`p-3 rounded-lg border ${value
                ? 'bg-green-500/10 border-green-500/30'
                : 'bg-slate-800/50 border-slate-700/50'
            }`}>
            <div className="flex items-center gap-2">
                <Icon
                    size={16}
                    className={value ? 'text-green-400' : 'text-slate-500'}
                />
                <span className={`text-sm font-medium ${value ? 'text-green-300' : 'text-slate-400'
                    }`}>
                    {label}
                </span>
            </div>
        </div>
    );
}

function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex flex-col gap-1 p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
            <span className="text-xs text-slate-500 font-medium">{label}</span>
            <span className="text-sm text-white font-mono break-all">{value}</span>
        </div>
    );
}
