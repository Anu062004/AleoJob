'use client';

import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { WalletMultiButton } from '@provablehq/aleo-wallet-adaptor-react-ui';
import { useState, useEffect, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Lock, Wallet, CreditCard, CheckCircle, Loader2 } from 'lucide-react';

interface PaymentGateProps {
    children: ReactNode;
    requiredAmount: number;
    featureType: 'job_posting' | 'job_search';
    title?: string;
    description?: string;
}

/**
 * PaymentGate Component
 * Gates access to features behind wallet connection and payment
 * - Job Givers: 3 Aleo to post jobs
 * - Job Seekers: 1 Aleo to access job listings
 */
export function PaymentGate({
    children,
    requiredAmount,
    featureType,
    title = 'Payment Required',
    description
}: PaymentGateProps) {
    const { address, connected } = useWallet();
    const [hasPaid, setHasPaid] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isChecking, setIsChecking] = useState(true);

    // Check for existing payment status on mount
    useEffect(() => {
        if (connected && address) {
            const storageKey = `payment_${featureType}_${address}`;
            const paymentStatus = localStorage.getItem(storageKey);
            setHasPaid(paymentStatus === 'paid');
        } else {
            setHasPaid(false);
        }
        setIsChecking(false);
    }, [connected, address, featureType]);

    const handlePayment = async () => {
        if (!address) return;

        setIsProcessing(true);

        try {
            // Call the Aleo access control contract to deduct credits
            // Note: In production, this should use the wallet adapter's requestTransaction
            // For now, we use the API route which requires private key handling
            const { aleoClient } = await import('@/lib/aleo-client');
            
            // Call API routes - private key is handled server-side via environment variables
            // Note: In production, consider using wallet adapter's requestTransaction for better security
            let response;
            if (featureType === 'job_posting') {
                // For job givers: deduct 3 credits
                // Pass empty string - API route will use server-side private key
                response = await aleoClient.payJobGiverAccess(address, '');
            } else {
                // For job seekers: deduct 1 credit
                response = await aleoClient.payJobSeekerAccess(address, '');
            }

            if (response.success) {
                // Store payment status
                const storageKey = `payment_${featureType}_${address}`;
                localStorage.setItem(storageKey, 'paid');
                setHasPaid(true);

                console.log(`✅ Payment of ${requiredAmount} Aleo processed for ${featureType}`);
            } else {
                throw new Error(response.error || 'Payment failed');
            }
        } catch (error: any) {
            console.error('Payment failed:', error);
            alert(`Payment failed: ${error.message || 'Please try again.'}\n\nNote: Make sure your wallet has sufficient credits.`);
        } finally {
            setIsProcessing(false);
        }
    };

    // Show loading while checking payment status
    if (isChecking) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-aleo-purple" />
            </div>
        );
    }

    // If connected and paid, show the gated content
    if (connected && hasPaid) {
        return <>{children}</>;
    }

    // Payment gate UI
    return (
        <div className="min-h-screen flex items-center justify-center px-4 py-12">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md"
            >
                <Card glow className="p-8 text-center">
                    {/* Icon */}
                    <div className="mb-6">
                        <div className="w-20 h-20 mx-auto bg-gradient-to-br from-aleo-purple/20 to-indigo-500/20 rounded-2xl flex items-center justify-center border border-aleo-purple/30">
                            {connected ? (
                                <CreditCard size={40} className="text-aleo-purple-light" />
                            ) : (
                                <Lock size={40} className="text-aleo-purple-light" />
                            )}
                        </div>
                    </div>

                    {/* Title */}
                    <h2 className="text-2xl font-bold text-white mb-2">
                        {connected ? title : 'Connect Your Wallet'}
                    </h2>

                    {/* Description */}
                    <p className="text-slate-400 mb-6">
                        {connected
                            ? description || `Pay ${requiredAmount} Aleo to unlock this feature`
                            : 'Please connect your Leo Wallet to continue'
                        }
                    </p>

                    {/* Payment Info Box */}
                    {connected && (
                        <div className="bg-slate-800/50 rounded-xl p-4 mb-6 border border-slate-700">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-slate-400 text-sm">Required Payment</span>
                                <span className="text-white font-bold text-lg">{requiredAmount} ALEO</span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-500">From Wallet</span>
                                <span className="text-slate-400 font-mono">
                                    {address?.slice(0, 8)}...{address?.slice(-6)}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Action Button */}
                    {!connected ? (
                        <div className="w-full">
                            <WalletMultiButton className="wallet-adapter-button-trigger w-full" />
                        </div>
                    ) : (
                        <Button
                            variant="primary"
                            size="lg"
                            className="w-full"
                            glow
                            onClick={handlePayment}
                            disabled={isProcessing}
                        >
                            {isProcessing ? (
                                <>
                                    <Loader2 className="mr-2 animate-spin" size={20} />
                                    Processing Payment...
                                </>
                            ) : (
                                <>
                                    <CheckCircle className="mr-2" size={20} />
                                    Pay {requiredAmount} Aleo
                                </>
                            )}
                        </Button>
                    )}

                    {/* Feature Info */}
                    <div className="mt-6 pt-6 border-t border-slate-700">
                        <p className="text-xs text-slate-500">
                            {featureType === 'job_posting'
                                ? '💼 Payment grants access to post unlimited jobs'
                                : '🔍 Payment grants access to view and apply for all jobs'
                            }
                        </p>
                    </div>

                    {/* Privacy Notice */}
                    <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-500">
                        <Lock size={12} />
                        <span>Your payment is secured via Aleo's zero-knowledge proofs</span>
                    </div>
                </Card>
            </motion.div>
        </div>
    );
}
