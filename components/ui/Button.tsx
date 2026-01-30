import { ReactNode, ButtonHTMLAttributes } from 'react';
import { motion } from 'framer-motion';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  glow?: boolean;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  glow = false,
  className = '',
  ...props
}: ButtonProps) {
  const baseStyles = 'font-semibold rounded-xl transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed relative overflow-hidden';
  
  const variants = {
    primary: 'bg-accent-primary text-white hover:bg-accent-primary-hover shadow-lg shadow-accent-primary/20 hover:shadow-xl hover:shadow-accent-primary/30',
    secondary: 'bg-bg-elevated text-text-primary border border-border-subtle hover:border-border-accent hover:bg-bg-hover',
    outline: 'border-2 border-accent-primary text-accent-primary hover:bg-accent-primary/10 bg-transparent',
    ghost: 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated',
  };

  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  };

  return (
    <motion.button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${glow ? 'shadow-glow' : ''} ${className}`}
      whileHover={{ scale: 1.01, y: -1 }}
      whileTap={{ scale: 0.99 }}
      transition={{ duration: 0.15 }}
      {...props}
    >
      {children}
    </motion.button>
  );
}






