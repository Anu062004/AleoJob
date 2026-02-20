import { motion } from 'framer-motion';
import { ShieldCheck } from 'lucide-react';
import { ReputationEntry } from './types';

interface ReputationCardProps {
  entry: ReputationEntry;
}

function clampScore(score: number): number {
  if (Number.isNaN(score)) return 0;
  return Math.min(100, Math.max(0, score));
}

export function ReputationCard({ entry }: ReputationCardProps) {
  const score = clampScore(entry.score);
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const progress = circumference - (score / 100) * circumference;
  const gradientId = `ring-gradient-${entry.id}`;

  return (
    <motion.article
      whileHover={{ y: -2, scale: 1.01 }}
      className="glass-card rounded-2xl p-4"
    >
      <div className="flex items-center gap-4">
        <div className="relative">
          <svg width="92" height="92" viewBox="0 0 92 92" className="-rotate-90">
            <defs>
              <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#7C5CFF" />
                <stop offset="100%" stopColor="#00E5FF" />
              </linearGradient>
            </defs>
            <circle cx="46" cy="46" r={radius} stroke="rgba(139,155,176,0.2)" strokeWidth="8" fill="transparent" />
            <motion.circle
              cx="46"
              cy="46"
              r={radius}
              stroke={`url(#${gradientId})`}
              strokeWidth="8"
              fill="transparent"
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: progress }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-brand-text">
            {score}
          </div>
        </div>

        <div className="flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-brand-text">{entry.alias}</p>
            <span className="rounded-full border border-brand-border px-2 py-0.5 text-[11px] uppercase tracking-wide text-brand-text-muted">
              {entry.role}
            </span>
          </div>
          <p className="mt-1 font-mono text-xs text-brand-text-muted">
            {entry.address.slice(0, 10)}...{entry.address.slice(-5)}
          </p>
          <div className="mt-3 inline-flex items-center gap-1 rounded-full border border-brand-secondary/30 bg-brand-secondary/10 px-2.5 py-1 text-xs text-brand-secondary">
            <ShieldCheck size={13} />
            {entry.proofCount} verified proofs
          </div>
        </div>
      </div>
    </motion.article>
  );
}
