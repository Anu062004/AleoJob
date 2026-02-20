import { motion } from 'framer-motion';
import { Orbit } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface EmptyStateProps {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  title = 'No Opportunities Yet',
  description = 'Be the first to interact with the protocol.',
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card rounded-2xl px-6 py-10 text-center"
    >
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-brand-primary/45 bg-brand-primary/15 text-brand-primary">
        <Orbit size={22} />
      </div>
      <h3 className="text-xl font-semibold text-brand-text">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-brand-text-muted">{description}</p>
      {actionLabel && onAction && (
        <div className="mt-5">
          <Button variant="secondary" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      )}
    </motion.div>
  );
}
