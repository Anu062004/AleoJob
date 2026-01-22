import { WalletDebugPanel } from '@/components/WalletDebugPanel';

export default function DebugPage() {
    return (
        <div className="container mx-auto px-4 py-12">
            <div className="max-w-3xl mx-auto space-y-6">
                <div className="text-center space-y-2">
                    <h1 className="text-4xl font-bold text-gradient">
                        Wallet Connection Debugger
                    </h1>
                    <p className="text-slate-400">
                        Use this page to diagnose wallet connection issues
                    </p>
                </div>

                <WalletDebugPanel />

                <div className="text-center text-sm text-slate-500">
                    <p>Open browser console (F12) for detailed logs</p>
                </div>
            </div>
        </div>
    );
}
