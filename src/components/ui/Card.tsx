import { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface CardProps {
    children: ReactNode;
    className?: string;
    hover?: boolean;
    glow?: boolean;
}

export function Card({ children, className = '', hover = false, glow = false }: CardProps) {
    const baseStyles = 'bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl';
    const hoverStyles = hover ? 'hover:border-aleo-purple/50 hover:bg-slate-800/70 transition-all duration-300' : '';
    const glowStyles = glow ? 'shadow-lg shadow-aleo-purple/10' : '';

    return (
        <motion.div
            className={`${baseStyles} ${hoverStyles} ${glowStyles} ${className}`}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.3 }}
        >
            {children}
        </motion.div>
    );
}
