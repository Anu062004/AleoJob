import { ReactNode } from 'react';

interface CardProps {
    children: ReactNode;
    className?: string;
    hover?: boolean;
    padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function Card({
  children,
  className = '',
  hover = false,
  padding = 'md'
}: CardProps) {
  const baseStyles = 'bg-brand-surface border border-brand-border rounded-2xl shadow-card-soft backdrop-blur';
  const hoverStyles = hover
    ? 'transition-all duration-250 hover:bg-brand-surface-elevated hover:border-brand-primary/40 hover:shadow-card-glow hover:-translate-y-0.5'
    : '';

  const paddingStyles = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  return (
    <div className={`${baseStyles} ${hoverStyles} ${paddingStyles[padding]} ${className}`}>
      {children}
    </div>
  );
}
