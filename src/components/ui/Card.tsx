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
    const baseStyles = 'bg-surface-card border border-border-subtle rounded-2xl shadow-card';
    const hoverStyles = hover
        ? 'transition-all duration-200 hover:bg-surface-hover hover:border-border-accent hover:shadow-card-hover hover:-translate-y-0.5'
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
