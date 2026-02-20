import { ReactNode, useMemo, useState } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';

interface ButtonProps extends HTMLMotionProps<'button'> {
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
  onMouseDown,
  ...props
}: ButtonProps) {
  const [ripples, setRipples] = useState<Array<{ id: number; x: number; y: number; size: number }>>([]);

  const baseStyles =
    'relative overflow-hidden font-semibold rounded-xl transition-all duration-250 disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center';

  const variants = useMemo(
    () => ({
      primary:
        'bg-gradient-to-r from-brand-primary to-brand-secondary text-brand-text shadow-glow-primary hover:shadow-glow-secondary',
      secondary:
        'bg-brand-surface text-brand-text border border-brand-primary/35 hover:border-brand-secondary/70 hover:bg-brand-surface-elevated',
      outline:
        'border border-brand-secondary/60 text-brand-secondary hover:bg-brand-secondary/10 hover:text-brand-text',
      ghost: 'text-brand-text-muted hover:text-brand-text hover:bg-brand-surface-elevated',
    }),
    []
  );

  const sizes = {
    sm: 'px-3.5 py-2 text-sm',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-7 py-3.5 text-base',
  };

  const handleMouseDown: HTMLMotionProps<'button'>['onMouseDown'] = (event) => {
    if (!disabled) {
      const target = event.currentTarget;
      const rect = target.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const x = event.clientX - rect.left - size / 2;
      const y = event.clientY - rect.top - size / 2;
      const id = Date.now() + Math.random();

      setRipples((prev) => [...prev, { id, x, y, size }]);
      window.setTimeout(() => {
        setRipples((prev) => prev.filter((ripple) => ripple.id !== id));
      }, 600);
    }

    onMouseDown?.(event);
  };

  return (
    <motion.button
      whileTap={disabled ? undefined : { scale: 0.98 }}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled}
      onMouseDown={handleMouseDown}
      {...props}
    >
      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          className="pointer-events-none absolute animate-ripple rounded-full bg-white/30"
          style={{
            left: ripple.x,
            top: ripple.y,
            width: ripple.size,
            height: ripple.size,
          }}
        />
      ))}
      <span className="relative z-10 inline-flex items-center gap-2">{children}</span>
    </motion.button>
  );
}
