import { ReactNode, ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    children: ReactNode;
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
}

export function Button({
    children,
    variant = 'primary',
    size = 'md',
    className = '',
    disabled,
    ...props
}: ButtonProps) {
    const baseStyles = 'font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center';

    const variants = {
        primary: 'bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:from-violet-500 hover:to-purple-500 shadow-lg shadow-violet-600/25 hover:shadow-violet-500/30 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]',
        secondary: 'bg-slate-800 text-slate-100 border border-slate-700 hover:bg-slate-700 hover:border-violet-500/50 shadow-md',
        outline: 'border-2 border-violet-500 text-violet-400 hover:bg-violet-500/10 hover:text-violet-300 active:scale-[0.98]',
        ghost: 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60',
    };

    const sizes = {
        sm: 'px-3.5 py-2 text-sm',
        md: 'px-5 py-2.5 text-sm',
        lg: 'px-7 py-3.5 text-base',
    };

    return (
        <button
            className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
            disabled={disabled}
            {...props}
        >
            {children}
        </button>
    );
}
