import { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  glow?: boolean;
}

export function Card({ children, className = '', hover = true, glow = false }: CardProps) {
  return (
    <motion.div
      className={`
        bg-bg-elevated backdrop-blur-sm rounded-2xl border border-border-subtle
        ${glow ? 'shadow-card-hover border-border-accent' : 'shadow-card'}
        ${hover ? 'hover:border-border-accent hover:shadow-card-hover' : ''}
        transition-all duration-200
        ${className}
      `}
      whileHover={hover ? { y: -2, transition: { duration: 0.2 } } : {}}
    >
      {children}
    </motion.div>
  );
}






