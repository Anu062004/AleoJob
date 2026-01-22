// Utility functions

export function generatePseudonym(address: string): string {
  // In production: Use deterministic hash of address
  // For now: Generate a readable pseudonym
  const hash = address.slice(-8).replace(/[^a-zA-Z0-9]/g, '');
  const prefix = address.startsWith('aleo1') ? 'user_' : 'addr_';
  return prefix + hash;
}

export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString('en-US')}`;
}

export function formatDeadline(timestamp: number): string {
  const now = Date.now();
  const diff = timestamp - now;
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  
  if (days < 0) return 'Expired';
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  return `Due in ${days} days`;
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}






