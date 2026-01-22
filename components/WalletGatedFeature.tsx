'use client';

import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { Card } from './ui/Card';
import { Shield, Lock, CheckCircle } from 'lucide-react';

/**
 * Example component showing how to use wallet connection in your features
 * This demonstrates gating content behind wallet connection
 */
export function WalletGatedFeature() {
    const { address, connected } = useWallet();

    if (!connected) {
        return (
            <Card className="p-8 text-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="p-4 bg-aleo-purple/10 rounded-full">
                        <Lock size={48} className="text-aleo-purple" />
                    </div>
                    <h3 className="text-2xl font-bold text-white">Wallet Required</h3>
                    <p className="text-slate-400 max-w-md">
                        Please connect your Leo Wallet to access this feature. Your connection is secure and private.
                    </p>
                </div>
            </Card>
        );
    }

    return (
        <Card className="p-8">
            <div className="flex flex-col gap-6">
                {/* Connected State Header */}
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-green-500/10 rounded-full">
                        <CheckCircle size={32} className="text-green-400" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-white">Wallet Connected</h3>
                        <p className="text-sm text-slate-400 font-mono">{address}</p>
                    </div>
                </div>

                {/* Feature Content - Replace with your actual feature */}
                <div className="space-y-4 pt-4 border-t border-slate-700">
                    <div className="flex items-center gap-3 text-slate-300">
                        <Shield size={20} className="text-aleo-purple" />
                        <span>Your data is private and secured with zero-knowledge proofs</span>
                    </div>

                    <p className="text-slate-400">
                        You can now access all features! Build your reputation, apply for jobs,
                        and earn rewards - all while maintaining your privacy.
                    </p>
                </div>
            </div>
        </Card>
    );
}
