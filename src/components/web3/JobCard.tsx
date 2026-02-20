import { motion } from 'framer-motion';
import { CheckCircle2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { OpportunityJob } from './types';

interface JobCardProps {
  job: OpportunityJob;
  applying?: boolean;
  canApply?: boolean;
  onQuickApply?: (jobId: string) => void;
}

export function JobCard({ job, applying = false, canApply = true, onQuickApply }: JobCardProps) {
  return (
    <motion.article
      whileHover={{ scale: 1.015, y: -2 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="glass-card group rounded-2xl p-5 transition-shadow hover:glow-outline"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-brand-text">{job.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-brand-text-muted">{job.summary}</p>
        </div>
        {job.zkVerified !== false && (
          <span className="inline-flex items-center gap-1 rounded-full border border-brand-secondary/35 bg-brand-secondary/10 px-2.5 py-1 text-xs text-brand-secondary">
            <CheckCircle2 size={13} />
            ZK Verified
          </span>
        )}
      </div>

      {job.skills.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {job.skills.map((skill) => (
            <span key={skill} className="rounded-full border border-brand-border bg-brand-surface-elevated px-2.5 py-1 text-xs text-brand-text-muted">
              {skill}
            </span>
          ))}
        </div>
      )}

      <div className="mt-5 flex items-center justify-between gap-3">
        <div className="text-sm text-brand-text-muted">
          {job.budget ? `${job.budget}` : 'Budget on request'}
        </div>
        <Button
          size="sm"
          variant="secondary"
          disabled={!canApply || applying}
          onClick={() => onQuickApply?.(job.id)}
          className="min-w-[110px] group-hover:border-brand-secondary/65"
        >
          <Sparkles size={14} />
          {applying ? 'Applying...' : 'Quick Apply'}
        </Button>
      </div>
    </motion.article>
  );
}
