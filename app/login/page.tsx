'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Shield, Lock, CheckCircle2, Loader2, Wallet } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { WalletMultiButton } from '@provablehq/aleo-wallet-adaptor-react-ui';
import { ALEO_CREDITS } from '@/lib/aleo-client';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const role = searchParams.get('role') || 'seeker';
  const [step, setStep] = useState<'connect' | 'verifying' | 'complete'>('connect');

  const { address, connected, connecting } = useWallet();

  const isSeeker = role === 'seeker';
  const requiredCredits = isSeeker ? ALEO_CREDITS.JOB_SEEKER_ACCESS : ALEO_CREDITS.JOB_GIVER_ACCESS;
  const cost = requiredCredits.toString();
  const roleName = isSeeker ? 'Job Seeker' : 'Job Giver';

  // Auto-proceed when wallet connects
  useEffect(() => {
    if (connected && address && step === 'connect') {
      handleProceed();
    }
  }, [connected, address]);

  const handleProceed = () => {
    if (!connected || !address) {
      return;
    }

    setStep('verifying');

    // Simulate ZK verification
    setTimeout(() => {
      setStep('complete');
      setTimeout(() => {
        router.push(isSeeker ? '/seeker' : '/giver');
      }, 1500);
    }, 2000);
  };

  return (
    <div className="min-h-screen container mx-auto px-4 py-24 lg:py-32 flex items-center justify-center">
      <motion.div
        className="max-w-md w-full"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <Card glow className="p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <motion.div
              className="w-16 h-16 bg-aleo-purple/20 rounded-2xl flex items-center justify-center mx-auto mb-4"
              animate={step === 'verifying' ? { rotate: 360 } : {}}
              transition={{ duration: 2, repeat: step === 'verifying' ? Infinity : 0 }}
            >
              {step === 'complete' ? (
                <CheckCircle2 className="text-emerald-400" size={32} />
              ) : (
                <Shield className="text-aleo-purple-light" size={32} />
              )}
            </motion.div>
            <h1 className="text-3xl font-bold mb-2 text-white">{roleName} Login</h1>
            <p className="text-slate-400 text-sm">Connect your Leo Wallet to get started</p>
            <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30">
              <span className="text-amber-400 text-xs font-medium">TESTNET ONLY</span>
            </div>
          </div>

          {/* Privacy Message */}
          <div className="bg-slate-700/50 border border-slate-600 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <Lock className="text-aleo-purple-light flex-shrink-0 mt-0.5" size={18} />
              <div>
                <p className="text-white text-sm font-medium mb-1">Privacy Guarantee</p>
                <p className="text-slate-400 text-xs leading-relaxed">
                  Your identity stays private. Aleo proves, we don't track.
                  Zero-knowledge proofs verify your credentials without revealing who you are.
                </p>
              </div>
            </div>
          </div>

          {/* Wallet Connection UI */}
          {step === 'connect' && (
            <div className="space-y-4 mb-6">
              {/* Connected Wallet Display */}
              {connected && address ? (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    <span className="text-green-400 text-sm font-medium">Wallet Connected</span>
                  </div>
                  <p className="text-white font-mono text-sm break-all">{address}</p>
                </motion.div>
              ) : (
                <div className="bg-slate-700/50 border border-slate-600 rounded-xl p-4 text-center">
                  <Wallet className="mx-auto mb-3 text-slate-400" size={32} />
                  <p className="text-slate-400 text-sm mb-4">
                    Connect your Leo Wallet to continue
                  </p>
                  <WalletMultiButton className="wallet-adapter-button-trigger w-full" />
                </div>
              )}

              {/* Cost Info */}
              <div className="bg-aleo-purple/10 border border-aleo-purple/30 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-300 text-sm">Access Cost</span>
                  <span className="text-aleo-purple-light font-semibold">{cost} Testnet Credit{parseInt(cost) > 1 ? 's' : ''}</span>
                </div>
                <p className="text-slate-500 text-xs pt-2 border-t border-slate-600">
                  ⚠️ Testnet credits only - No real value
                </p>
              </div>

              {/* Proceed Button (only if connected) */}
              {connected && address && (
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full"
                  onClick={handleProceed}
                  glow
                >
                  <CheckCircle2 className="mr-2" size={18} />
                  Continue as {roleName}
                </Button>
              )}
            </div>
          )}

          {/* Verifying State */}
          {step === 'verifying' && (
            <>
              <div className="bg-aleo-purple/10 border border-aleo-purple/30 rounded-xl p-4 mb-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-slate-300 text-sm">Access Cost</span>
                  <span className="text-aleo-purple-light font-semibold">{cost} Testnet Credit{parseInt(cost) > 1 ? 's' : ''}</span>
                </div>
                <div className="pt-3 border-t border-slate-600 space-y-2">
                  <div>
                    <p className="text-slate-400 text-xs mb-1">Connected Wallet:</p>
                    <p className="text-slate-300 text-sm font-mono break-all">{address}</p>
                  </div>
                </div>
              </div>

              <motion.div
                className="text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <Loader2 className="mx-auto mb-4 text-aleo-purple-light animate-spin" size={32} />
                <p className="text-slate-300 font-medium mb-2">Verifying Credentials</p>
                <p className="text-slate-400 text-sm">
                  Using zero-knowledge proofs to verify your access...
                </p>
              </motion.div>
            </>
          )}

          {/* Complete State */}
          {step === 'complete' && (
            <motion.div
              className="text-center"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <CheckCircle2 className="mx-auto mb-4 text-emerald-400" size={48} />
              <p className="text-slate-300 font-medium mb-2">Access Granted</p>
              <p className="text-slate-400 text-sm">Redirecting to your dashboard...</p>
            </motion.div>
          )}

          {/* Back Link */}
          {step === 'connect' && (
            <div className="text-center mt-6">
              <button
                onClick={() => router.push('/get-started')}
                className="text-slate-400 hover:text-white transition-colors text-sm"
              >
                ← Back to Role Selection
              </button>
            </div>
          )}
        </Card>
      </motion.div>
    </div>
  );
}

// Main export with Suspense boundary for useSearchParams
export default function Login() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
