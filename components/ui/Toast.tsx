'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Info, AlertCircle } from 'lucide-react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info' | 'warning';
  isVisible: boolean;
  onClose: () => void;
}

export function Toast({ message, type = 'info', isVisible, onClose }: ToastProps) {
  const icons = {
    success: CheckCircle,
    error: XCircle,
    info: Info,
    warning: AlertCircle,
  };

  const colors = {
    success: 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400',
    error: 'bg-red-500/20 border-red-500/50 text-red-400',
    info: 'bg-aleo-purple/20 border-aleo-purple/50 text-aleo-purple-light',
    warning: 'bg-amber-500/20 border-amber-500/50 text-amber-400',
  };

  const Icon = icons[type];

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border ${colors[type]} shadow-lg`}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
        >
          <Icon size={20} />
          <span className="font-medium">{message}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}






