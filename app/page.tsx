'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Shield, TrendingUp, Lock, Wallet, CheckCircle2, ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

const features = [
  {
    icon: Shield,
    title: 'Privacy First',
    description: 'Your identity stays private. Aleo ZK proofs verify credentials without revealing who you are.',
  },
  {
    icon: TrendingUp,
    title: 'Real Reputation',
    description: 'Build trust through verifiable reputation scores, all without exposing personal data.',
  },
  {
    icon: Lock,
    title: 'Secure Escrow',
    description: 'Payment held in escrow until job completion. Transparent, secure, automated.',
  },
  {
    icon: Wallet,
    title: 'Fair Access',
    description: 'Simple, transparent fees. Job Seekers: 1 credit. Job Givers: 3 credits.',
  },
];

const steps = [
  {
    number: '01',
    title: 'Choose Your Role',
    description: 'Join as a Job Seeker or Job Giver. Connect your Aleo wallet.',
  },
  {
    number: '02',
    title: 'Verify Privately',
    description: 'Aleo ZK proofs verify your credentials without exposing identity.',
  },
  {
    number: '03',
    title: 'Work Anonymously',
    description: 'Complete jobs, build reputation, get paid—all while staying private.',
  },
];

export default function Home() {
  return (
    <div className="min-h-screen relative">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-24 lg:py-32">
        <motion.div
          className="max-w-5xl mx-auto text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <motion.h1
            className="text-5xl md:text-7xl font-bold mb-6 text-gradient glow-text"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            Private Jobs. Real Reputation.
            <br />
            <span className="text-white">Zero Doxxing.</span>
          </motion.h1>
          
          <motion.p
            className="text-xl md:text-2xl text-slate-300 mb-12 max-w-3xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            The privacy-preserving job marketplace built on Aleo. Work, earn, and build reputation
            without ever revealing your identity.
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <Link href="/get-started">
              <Button variant="primary" size="lg" glow className="w-full sm:w-auto">
                Find Work
                <ArrowRight className="inline ml-2" size={20} />
              </Button>
            </Link>
            <Link href="/get-started">
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                Post a Job
              </Button>
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16 lg:py-24">
        <motion.div
          className="grid md:grid-cols-2 lg:grid-cols-4 gap-6"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
              >
                <Card hover glow className="p-6 h-full">
                  <div className="w-12 h-12 bg-aleo-purple/20 rounded-xl flex items-center justify-center mb-4">
                    <Icon className="text-aleo-purple-light" size={24} />
                  </div>
                  <h3 className="text-xl font-semibold mb-2 text-white">{feature.title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{feature.description}</p>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      </section>

      {/* How It Works */}
      <section className="container mx-auto px-4 py-16 lg:py-24">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-white">How It Works</h2>
          <p className="text-slate-400 text-lg">Three simple steps to start earning privately</p>
        </motion.div>

        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, index) => (
              <motion.div
                key={step.number}
                className="relative"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.2 }}
              >
                <Card className="p-8 h-full">
                  <div className="text-6xl font-bold text-aleo-purple/20 mb-4">{step.number}</div>
                  <h3 className="text-2xl font-semibold mb-3 text-white">{step.title}</h3>
                  <p className="text-slate-400">{step.description}</p>
                </Card>
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 w-8 h-0.5 bg-aleo-purple/30">
                    <ArrowRight className="absolute -right-2 top-1/2 -translate-y-1/2 text-aleo-purple" size={16} />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Aleo-Powered Section */}
      <section className="container mx-auto px-4 py-16 lg:py-24">
        <Card glow className="p-12 max-w-4xl mx-auto text-center">
          <Shield className="mx-auto mb-6 text-aleo-purple-light" size={48} />
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
            Powered by Aleo Zero-Knowledge Proofs
          </h2>
          <p className="text-slate-300 text-lg mb-6 max-w-2xl mx-auto">
            AleoJob uses advanced zero-knowledge cryptography to verify your qualifications,
            reputation, and work history—all without ever knowing who you are.
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-sm text-slate-400">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="text-emerald-400" size={16} />
              <span>Identity stays private</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="text-emerald-400" size={16} />
              <span>Credentials verified via ZK</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="text-emerald-400" size={16} />
              <span>No tracking, no surveillance</span>
            </div>
          </div>
        </Card>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16 lg:py-24">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white">
            Ready to Work Privately?
          </h2>
          <p className="text-slate-400 text-lg mb-8">
            Join AleoJob and experience the future of private job marketplaces.
          </p>
          <Link href="/get-started">
            <Button variant="primary" size="lg" glow>
              Get Started Now
              <ArrowRight className="inline ml-2" size={20} />
            </Button>
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-700/50 mt-24">
        <div className="container mx-auto px-4 py-12">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Shield size={24} className="text-aleo-purple-light" />
                <span className="text-xl font-bold text-white">AleoJob</span>
              </div>
              <p className="text-slate-400 text-sm">
                Privacy-preserving job marketplace on Aleo blockchain.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-white">Platform</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><Link href="/jobs" className="hover:text-white transition-colors">Browse Jobs</Link></li>
                <li><Link href="/leaderboard" className="hover:text-white transition-colors">Leaderboard</Link></li>
                <li><Link href="/get-started" className="hover:text-white transition-colors">Get Started</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-white">Resources</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><Link href="#" className="hover:text-white transition-colors">Documentation</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Terms of Service</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-white">About</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><Link href="#" className="hover:text-white transition-colors">How It Works</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Reputation System</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-700/50 pt-8 text-center text-sm text-slate-400">
            <p>&copy; 2024 AleoJob. Built on Aleo blockchain.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
