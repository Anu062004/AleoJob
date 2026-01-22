'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { User, Briefcase, Shield, CheckCircle2, ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

const roles = [
  {
    id: 'seeker',
    icon: User,
    title: 'Job Seeker',
    cost: '1 Aleo credit',
    description: 'Find and apply for jobs. Build your reputation privately.',
    features: [
      'Browse private job listings',
      'Apply with ZK-verified credentials',
      'Build reputation anonymously',
      'Get paid via secure escrow',
    ],
    href: '/login?role=seeker',
  },
  {
    id: 'giver',
    icon: Briefcase,
    title: 'Job Giver',
    cost: '3 Aleo credits',
    description: 'Post jobs and find talented freelancers.',
    features: [
      'Post jobs with privacy-first approach',
      'Find qualified candidates via ZK proofs',
      'Secure payments through escrow',
      'Build employer reputation',
    ],
    href: '/login?role=giver',
  },
];

export default function GetStarted() {
  return (
    <div className="min-h-screen container mx-auto px-4 py-24 lg:py-32">
      <motion.div
        className="max-w-5xl mx-auto"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Header */}
        <div className="text-center mb-16">
          <motion.h1
            className="text-5xl md:text-6xl font-bold mb-6 text-gradient glow-text"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            Choose Your Role
          </motion.h1>
          <motion.p
            className="text-xl text-slate-300 max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            Select whether you're looking for work or posting jobs.
            Your privacy is guaranteed regardless of your choice.
          </motion.p>
        </div>

        {/* Role Cards */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {roles.map((role, index) => {
            const Icon = role.icon;
            return (
              <motion.div
                key={role.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.2 }}
              >
                <Card hover glow className="p-8 h-full flex flex-col group cursor-pointer">
                  <Link href={role.href} className="flex flex-col h-full">
                    <div className="w-16 h-16 bg-aleo-purple/20 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-aleo-purple/30 transition-colors">
                      <Icon className="text-aleo-purple-light" size={32} />
                    </div>
                    
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-3xl font-bold text-white">{role.title}</h2>
                      <div className="px-3 py-1 bg-aleo-purple/20 border border-aleo-purple/30 rounded-full">
                        <span className="text-sm font-semibold text-aleo-purple-light">{role.cost}</span>
                      </div>
                    </div>
                    
                    <p className="text-slate-400 mb-6 flex-grow">{role.description}</p>
                    
                    <div className="space-y-3 mb-8">
                      {role.features.map((feature, idx) => (
                        <div key={idx} className="flex items-start gap-3">
                          <CheckCircle2 className="text-emerald-400 flex-shrink-0 mt-0.5" size={18} />
                          <span className="text-slate-300 text-sm">{feature}</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center gap-2 text-aleo-purple-light group-hover:gap-4 transition-all">
                      <span className="font-semibold">Get Started</span>
                      <ArrowRight size={20} />
                    </div>
                  </Link>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Privacy Notice */}
        <motion.div
          className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 max-w-3xl mx-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <div className="flex items-start gap-4">
            <Shield className="text-aleo-purple-light flex-shrink-0" size={24} />
            <div>
              <h3 className="font-semibold text-white mb-2">Privacy Guarantee</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Your identity stays private. Aleo proves your qualifications and reputation
                without revealing who you are. We don't track, store, or sell your personal data.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Back Link */}
        <div className="text-center mt-12">
          <Link href="/" className="text-slate-400 hover:text-white transition-colors text-sm inline-flex items-center gap-2">
            ← Back to Home
          </Link>
        </div>
      </motion.div>
    </div>
  );
}






