import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';

const chips = [
  'Anonymous Identity',
  'ZK Verified Skills',
  'Escrow Protected Payments',
];

export function Hero() {
  return (
    <section className="relative section-anchor overflow-hidden px-4 pb-20 pt-16 md:px-6 md:pt-24">
      <div className="protocol-grid pointer-events-none absolute inset-0 opacity-30" />

      <motion.div
        animate={{ opacity: [0.35, 0.55, 0.35] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        className="pointer-events-none absolute -left-20 top-16 h-72 w-72 rounded-full bg-brand-primary/35 blur-[110px]"
      />
      <motion.div
        animate={{ opacity: [0.22, 0.45, 0.22] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        className="pointer-events-none absolute -right-20 top-28 h-80 w-80 rounded-full bg-brand-secondary/35 blur-[120px]"
      />

      <div className="relative mx-auto max-w-5xl">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-primary/40 bg-brand-primary/10 px-4 py-1.5 text-xs tracking-wide text-brand-text-muted">
            <Sparkles size={14} className="text-brand-secondary" />
            Aleo Zero-Knowledge Labor Protocol
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-brand-text md:text-6xl">
            Work Privately. Prove Publicly.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-brand-text-muted md:text-lg">
            The first zero-knowledge job protocol built on Aleo.
          </p>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {chips.map((chip) => (
            <motion.span
              key={chip}
              whileHover={{ y: -2 }}
              className="rounded-full border border-brand-border bg-chip-gradient px-4 py-2 text-xs text-brand-text"
            >
              {chip}
            </motion.span>
          ))}
        </div>

        <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
          <Link to="/get-started">
            <Button size="lg" variant="primary">
              Enter the Protocol
              <ArrowRight size={16} />
            </Button>
          </Link>
          <Link to="/jobs">
            <Button size="lg" variant="secondary">
              Explore Jobs
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
