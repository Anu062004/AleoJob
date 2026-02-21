'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Shield, Lock, CheckCircle, Loader2, Wallet, ArrowLeft } from 'lucide-react';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { WalletMultiButton } from '@provablehq/aleo-wallet-adaptor-react-ui';
import { ALEO_CREDITS } from '@/lib/aleo-client';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const role = searchParams.get('role') || 'seeker';
  const [step, setStep] = useState<'connect' | 'verifying' | 'complete'>('connect');

  const { address, connected } = useWallet();
  const isSeeker = role === 'seeker';
  const requiredCredits = isSeeker ? ALEO_CREDITS.JOB_SEEKER_ACCESS : ALEO_CREDITS.JOB_GIVER_ACCESS;
  const cost = requiredCredits.toString();
  const roleName = isSeeker ? 'Job Seeker' : 'Job Giver';

  useEffect(() => {
    if (connected && address && step === 'connect') handleProceed();
  }, [connected, address]);

  const handleProceed = () => {
    if (!connected || !address) return;
    setStep('verifying');
    setTimeout(() => {
      setStep('complete');
      setTimeout(() => {
        router.push(isSeeker ? '/seeker' : '/giver');
      }, 1500);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4 py-16" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Soft BG orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute rounded-full opacity-20 blur-3xl" style={{ width: 500, height: 500, background: 'radial-gradient(circle, #818cf8, transparent 70%)', top: '-100px', left: '-100px' }} />
        <div className="absolute rounded-full opacity-10 blur-3xl" style={{ width: 400, height: 400, background: 'radial-gradient(circle, #a78bfa, transparent 70%)', bottom: '-50px', right: '-50px' }} />
      </div>

      <motion.div
        className="relative w-full max-w-md"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Back */}
        <button
          onClick={() => router.push('/get-started')}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600 transition-colors mb-8 font-medium"
        >
          <ArrowLeft size={15} />
          Back
        </button>

        <div className="bg-white border border-gray-100 rounded-3xl shadow-2xl shadow-indigo-50 p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <motion.div
              className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-indigo-200"
              animate={step === 'verifying' ? { rotate: 360 } : {}}
              transition={{ duration: 2, repeat: step === 'verifying' ? Infinity : 0 }}
            >
              {step === 'complete' ? (
                <CheckCircle className="text-white" size={30} />
              ) : (
                <Shield className="text-white" size={30} />
              )}
            </motion.div>
            <h1 className="text-2xl font-extrabold text-gray-900 mb-1">{roleName} Login</h1>
            <p className="text-gray-500 text-sm">Connect your Leo Wallet to get started</p>
            <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200">
              <span className="text-amber-600 text-xs font-semibold">TESTNET ONLY</span>
            </div>
          </div>

          {/* Privacy card */}
          <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <Lock className="text-indigo-500 shrink-0 mt-0.5" size={17} />
              <div>
                <p className="text-indigo-900 text-sm font-semibold mb-0.5">Privacy Guarantee</p>
                <p className="text-indigo-700 text-xs leading-relaxed">
                  Your identity stays private. Zero-knowledge proofs verify credentials without revealing who you are.
                </p>
              </div>
            </div>
          </div>

          {/* Connect step */}
          {step === 'connect' && (
            <div className="space-y-4">
              {connected && address ? (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-green-50 border border-green-200 rounded-2xl p-4"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-green-700 text-sm font-semibold">Wallet Connected</span>
                  </div>
                  <p className="text-gray-700 font-mono text-xs break-all">{address}</p>
                </motion.div>
              ) : (
                <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5 text-center">
                  <div className="w-12 h-12 bg-white border border-gray-200 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <Wallet className="text-gray-400" size={24} />
                  </div>
                  <p className="text-gray-600 text-sm mb-4">Connect your Leo Wallet to continue</p>
                  <WalletMultiButton className="wallet-adapter-button-trigger w-full" />
                </div>
              )}

              {/* Cost info */}
              <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 text-sm">Access cost</span>
                  <span className="text-indigo-700 font-bold text-sm">
                    {cost} Testnet Credit{parseInt(cost) > 1 ? 's' : ''}
                  </span>
                </div>
                <p className="text-gray-400 text-xs mt-2 pt-2 border-t border-indigo-100">
                  Testnet credits only — no real monetary value
                </p>
              </div>

              {connected && address && (
                <button
                  onClick={handleProceed}
                  className="w-full bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-semibold py-3.5 rounded-xl hover:shadow-lg hover:shadow-indigo-200 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
                >
                  <CheckCircle size={18} />
                  Continue as {roleName}
                </button>
              )}
            </div>
          )}

          {/* Verifying step */}
          {step === 'verifying' && (
            <div className="text-center py-8">
              <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <Loader2 className="text-indigo-500 animate-spin" size={28} />
              </div>
              <p className="text-gray-900 font-semibold mb-1">Verifying Credentials</p>
              <p className="text-gray-500 text-sm">Using zero-knowledge proofs to verify your access...</p>
              <div className="mt-4 bg-indigo-50 border border-indigo-100 rounded-xl p-3 text-left">
                <p className="text-xs text-gray-500 mb-1">Wallet:</p>
                <p className="text-xs text-gray-700 font-mono break-all">{address}</p>
              </div>
            </div>
          )}

          {/* Complete step */}
          {step === 'complete' && (
            <motion.div
              className="text-center py-8"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <div className="w-16 h-16 bg-green-50 border border-green-200 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <CheckCircle className="text-green-500" size={32} />
              </div>
              <p className="text-gray-900 font-bold text-lg mb-1">Access Granted</p>
              <p className="text-gray-500 text-sm">Redirecting to your dashboard...</p>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export default function Login() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
