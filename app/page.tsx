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
      <section className="container mx-auto px-4 py-32 lg:py-40">
        <motion.div
          className="max-w-5xl mx-auto text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <motion.h1
            className="text-5xl md:text-7xl lg:text-8xl font-bold mb-8 text-gradient leading-tight tracking-tight"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            Private Jobs.
            <br />
            <span className="text-text-primary">Real Reputation.</span>
            <br />
            <span className="text-gradient">Zero Doxxing.</span>
          </motion.h1>
          
          <motion.p
            className="text-lg md:text-xl text-text-secondary mb-12 max-w-2xl mx-auto leading-relaxed"
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
              <Button variant="primary" size="lg" className="w-full sm:w-auto">
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
      <section className="container mx-auto px-4 py-20 lg:py-28">
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
                <Card hover className="p-6 h-full">
                  <div className="w-14 h-14 bg-accent-primary/10 rounded-xl flex items-center justify-center mb-5 border border-accent-primary/20">
                    <Icon className="text-accent-primary" size={24} />
                  </div>
                  <h3 className="text-lg font-semibold mb-3 text-text-primary">{feature.title}</h3>
                  <p className="text-text-secondary text-sm leading-relaxed">{feature.description}</p>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      </section>

      {/* How It Works */}
      <section className="container mx-auto px-4 py-20 lg:py-28">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-text-primary tracking-tight">How It Works</h2>
          <p className="text-text-secondary text-lg">Three simple steps to start earning privately</p>
        </motion.div>

        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, index) => (
              <motion.div
                key={step.number}
                className="relative"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.15 }}
              >
                <Card className="p-8 h-full">
                  <div className="text-5xl font-bold text-accent-primary/10 mb-6 leading-none">{step.number}</div>
                  <h3 className="text-xl font-semibold mb-3 text-text-primary">{step.title}</h3>
                  <p className="text-text-secondary leading-relaxed">{step.description}</p>
                </Card>
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 w-8 h-0.5 bg-accent-primary/20">
                    <ArrowRight className="absolute -right-2 top-1/2 -translate-y-1/2 text-accent-primary/40" size={16} />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Aleo-Powered Section */}
      <section className="container mx-auto px-4 py-20 lg:py-28">
        <Card className="p-12 md:p-16 max-w-4xl mx-auto text-center border-border-accent">
          <Shield className="mx-auto mb-8 text-accent-primary" size={56} />
          <h2 className="text-3xl md:text-4xl font-bold mb-6 text-text-primary tracking-tight">
            Powered by Aleo Zero-Knowledge Proofs
          </h2>
          <p className="text-text-secondary text-lg mb-8 max-w-2xl mx-auto leading-relaxed">
            AleoJob uses advanced zero-knowledge cryptography to verify your qualifications,
            reputation, and work history—all without ever knowing who you are.
          </p>
          <div className="flex flex-wrap justify-center gap-6 text-sm">
            <div className="flex items-center gap-2 text-text-secondary">
              <CheckCircle2 className="text-success" size={18} />
              <span>Identity stays private</span>
            </div>
            <div className="flex items-center gap-2 text-text-secondary">
              <CheckCircle2 className="text-success" size={18} />
              <span>Credentials verified via ZK</span>
            </div>
            <div className="flex items-center gap-2 text-text-secondary">
              <CheckCircle2 className="text-success" size={18} />
              <span>No tracking, no surveillance</span>
            </div>
          </div>
        </Card>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20 lg:py-28">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-text-primary tracking-tight">
            Ready to Work Privately?
          </h2>
          <p className="text-text-secondary text-lg mb-10">
            Join AleoJob and experience the future of private job marketplaces.
          </p>
          <Link href="/get-started">
            <Button variant="primary" size="lg">
              Get Started Now
              <ArrowRight className="inline ml-2" size={20} />
            </Button>
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border-subtle mt-24 bg-bg-secondary/50">
        <div className="container mx-auto px-4 py-16">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Shield size={24} className="text-accent-primary" />
                <span className="text-xl font-bold text-text-primary">AleoJob</span>
              </div>
              <p className="text-text-secondary text-sm leading-relaxed">
                Privacy-preserving job marketplace on Aleo blockchain.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-text-primary">Platform</h4>
              <ul className="space-y-2 text-sm text-text-secondary">
                <li><Link href="/jobs" className="hover:text-text-primary transition-colors">Browse Jobs</Link></li>
                <li><Link href="/leaderboard" className="hover:text-text-primary transition-colors">Leaderboard</Link></li>
                <li><Link href="/get-started" className="hover:text-text-primary transition-colors">Get Started</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-text-primary">Resources</h4>
              <ul className="space-y-2 text-sm text-text-secondary">
                <li><Link href="#" className="hover:text-text-primary transition-colors">Documentation</Link></li>
                <li><Link href="#" className="hover:text-text-primary transition-colors">Privacy Policy</Link></li>
                <li><Link href="#" className="hover:text-text-primary transition-colors">Terms of Service</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-text-primary">About</h4>
              <ul className="space-y-2 text-sm text-text-secondary">
                <li><Link href="#" className="hover:text-text-primary transition-colors">How It Works</Link></li>
                <li><Link href="#" className="hover:text-text-primary transition-colors">Reputation System</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border-subtle pt-8 text-center text-sm text-text-muted">
            <p>&copy; 2024 AleoJob. Built on Aleo blockchain.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
