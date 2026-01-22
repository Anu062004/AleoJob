import { ReactNode, ButtonHTMLAttributes } from 'react';
import { motion } from 'framer-motion';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'outline';
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
  const baseStyles = 'font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variants = {
    primary: 'bg-gradient-to-r from-aleo-purple to-aleo-purple-light text-white hover:shadow-lg hover:shadow-aleo-purple/50',
    secondary: 'bg-slate-700/50 text-white border border-slate-600 hover:bg-slate-700',
    outline: 'border-2 border-aleo-purple text-aleo-purple hover:bg-aleo-purple/10',
  };

  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  };

  return (
    <motion.button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${glow ? 'animate-glow' : ''} ${className}`}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      {...props}
    >
      {children}
    </motion.button>
  );
}






