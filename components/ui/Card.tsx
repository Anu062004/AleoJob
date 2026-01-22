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
        bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50
        ${glow ? 'shadow-lg shadow-aleo-purple/20' : ''}
        ${className}
      `}
      whileHover={hover ? { y: -4, transition: { duration: 0.2 } } : {}}
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.div>
  );
}






