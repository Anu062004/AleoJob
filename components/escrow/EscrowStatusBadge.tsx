// Escrow Status Badge Component
// Displays escrow status with appropriate colors

import { Badge } from '@/components/ui/Badge';

interface EscrowStatusBadgeProps {
  status: 'locked' | 'released' | 'refunded';
  className?: string;
}

export function EscrowStatusBadge({ status, className }: EscrowStatusBadgeProps) {
  const variants = {
    locked: {
      variant: 'warning' as const,
      label: 'Locked',
    },
    released: {
      variant: 'success' as const,
      label: 'Released',
    },
    refunded: {
      variant: 'destructive' as const,
      label: 'Refunded',
    },
  };

  const config = variants[status];

  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  );
}



