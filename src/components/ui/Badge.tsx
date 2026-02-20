import { ReactNode, type HTMLAttributes } from 'react';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
    children: ReactNode;
    variant?: 'default' | 'purple' | 'success' | 'warning' | 'info' | 'muted';
    size?: 'sm' | 'md';
    className?: string;
}

export function Badge({
  children,
  variant = 'default',
  size = 'sm',
  className = '',
  ...props
}: BadgeProps) {
  const baseStyles = 'inline-flex items-center font-medium rounded-full';

  const variants = {
    default: 'bg-brand-surface-elevated text-brand-text-muted border border-brand-border',
    purple: 'bg-brand-primary/15 text-brand-primary border border-brand-primary/40',
    success: 'bg-emerald-500/15 text-emerald-300 border border-emerald-400/35',
    warning: 'bg-amber-500/15 text-amber-300 border border-amber-400/35',
    info: 'bg-sky-500/15 text-sky-300 border border-sky-400/35',
    muted: 'bg-brand-surface-elevated text-brand-text-muted',
  };

  const sizes = {
    sm: 'px-2.5 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
  };

  return (
    <span className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {children}
    </span>
  );
}
