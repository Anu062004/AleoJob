'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { User, Briefcase, Shield, CheckCircle, ArrowRight } from 'lucide-react';

const roles = [
  {
    id: 'seeker',
    icon: User,
    title: 'Job Seeker',
    cost: '1 Aleo credit',
    description: 'Find and apply for top ZK developer roles. Build your reputation privately with zero-knowledge proofs.',
    features: [
      'Browse private job listings',
      'Apply with ZK-verified credentials',
      'Build reputation anonymously',
      'Get paid via secure escrow',
    ],
    href: '/login?role=seeker',
    gradient: 'from-indigo-500 to-violet-600',
    accent: 'indigo',
    shadow: 'hover:shadow-indigo-100',
  },
  {
    id: 'giver',
    icon: Briefcase,
    title: 'Job Giver',
    cost: '3 Aleo credits',
    description: 'Post jobs and hire elite ZK developers, researchers, and engineers in the Aleo ecosystem.',
    features: [
      'Post jobs with privacy-first approach',
      'Find qualified candidates via ZK proofs',
      'Secure payments through escrow',
      'Build employer reputation on-chain',
    ],
    href: '/login?role=giver',
    gradient: 'from-violet-500 to-purple-600',
    accent: 'violet',
    shadow: 'hover:shadow-violet-100',
  },
];

export default function GetStarted() {
  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute rounded-full opacity-20 blur-3xl"
          style={{ width: 500, height: 500, background: 'radial-gradient(circle, #818cf8 0%, transparent 70%)', top: '-100px', left: '-100px' }}
        />
        <div
          className="absolute rounded-full opacity-10 blur-3xl"
          style={{ width: 400, height: 400, background: 'radial-gradient(circle, #a78bfa 0%, transparent 70%)', bottom: '0px', right: '-50px' }}
        />
      </div>

      <div className="relative max-w-5xl mx-auto px-6 py-16 lg:py-24">
        {/* Back */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="mb-10"
        >
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-indigo-600 transition-colors font-medium">
            ← Back to Home
          </Link>
        </motion.div>

        {/* Header */}
        <motion.div
          className="text-center mb-14"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-full px-4 py-1.5 text-xs font-semibold mb-6 tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
            Privacy-First Marketplace
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 mb-5 tracking-tight leading-[1.08]">
            Choose Your{' '}
            <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
              Role
            </span>
          </h1>
          <p className="text-lg text-gray-500 max-w-xl mx-auto">
            Select whether you're looking for work or posting jobs. Your privacy is guaranteed regardless of your choice.
          </p>
        </motion.div>

        {/* Role Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-10">
          {roles.map((role, index) => {
            const Icon = role.icon;
            return (
              <motion.div
                key={role.id}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.15 }}
              >
                <Link href={role.href}>
                  <div className={`group bg-white border border-gray-100 rounded-3xl p-9 h-full flex flex-col hover:border-indigo-200 hover:shadow-2xl ${role.shadow} hover:-translate-y-1 transition-all duration-300 cursor-pointer`}>
                    {/* Icon + Cost */}
                    <div className="flex items-start justify-between mb-7">
                      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${role.gradient} flex items-center justify-center shadow-md`}>
                        <Icon className="text-white" size={26} />
                      </div>
                      <div className="bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold px-3 py-1.5 rounded-full">
                        {role.cost}
                      </div>
                    </div>

                    <h2 className="text-2xl font-extrabold text-gray-900 mb-2">{role.title}</h2>
                    <p className="text-gray-500 mb-7 leading-relaxed text-sm flex-grow">{role.description}</p>

                    <div className="space-y-3 mb-8">
                      {role.features.map((feature, idx) => (
                        <div key={idx} className="flex items-center gap-3">
                          <CheckCircle size={16} className="text-indigo-500 shrink-0" />
                          <span className="text-gray-700 text-sm">{feature}</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center gap-2 font-semibold text-indigo-600 group-hover:gap-4 transition-all text-sm">
                      Get Started
                      <ArrowRight size={16} />
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>

        {/* Privacy Notice */}
        <motion.div
          className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6 max-w-2xl mx-auto"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35 }}
        >
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
              <Shield className="text-indigo-600" size={20} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 mb-1">Privacy Guarantee</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Your identity stays private. Aleo proves your qualifications and reputation without revealing who you are. We don't track, store, or sell your personal data.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
