import { ReactNode } from 'react';

interface BadgeProps {
    children: ReactNode;
    variant?: 'default' | 'purple' | 'success' | 'warning' | 'muted';
    size?: 'sm' | 'md';
    className?: string;
}

export function Badge({
    children,
    variant = 'default',
    size = 'sm',
    className = ''
}: BadgeProps) {
    const baseStyles = 'inline-flex items-center font-medium rounded-lg';

    const variants = {
        default: 'bg-surface-elevated text-text-secondary border border-border-subtle',
        purple: 'bg-aleo-purple/10 text-aleo-purple border border-aleo-purple/20',
        success: 'bg-status-success/10 text-status-success border border-status-success/20',
        warning: 'bg-status-warning/10 text-status-warning border border-status-warning/20',
        muted: 'bg-surface-hover text-text-muted',
    };

    const sizes = {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-2.5 py-1 text-sm',
    };

    return (
        <span className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}>
            {children}
        </span>
    );
}
