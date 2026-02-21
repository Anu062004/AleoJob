import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './index.html',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: '#ffffff',
          surface: '#f8fafc',
          'surface-elevated': '#f1f5f9',
          primary: '#6366f1',
          secondary: '#8b5cf6',
          text: '#111827',
          'text-muted': '#6b7280',
          border: '#e5e7eb',
        },
        // Legacy aliases
        'bg-primary': '#ffffff',
        'bg-secondary': '#f8fafc',
        'bg-elevated': '#f1f5f9',
        'surface-main': '#ffffff',
        'surface-card': '#ffffff',
        'surface-elevated': '#f1f5f9',
        'surface-hover': '#f8fafc',
        'text-primary': '#111827',
        'text-secondary': '#374151',
        'text-muted': '#6b7280',
        'border-subtle': '#e5e7eb',
        'border-accent': 'rgba(99, 102, 241, 0.4)',
        'status-success': '#22C55E',
        'status-warning': '#F59E0B',
        'aleo-purple': '#6366f1',
        'aleo-purple-light': '#818cf8',
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'sans-serif'],
        mono: ['IBM Plex Mono', 'JetBrains Mono', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'card-soft': '0 4px 24px rgba(0, 0, 0, 0.06)',
        'card-glow': '0 0 0 1px rgba(99, 102, 241, 0.2), 0 8px 32px rgba(0, 0, 0, 0.08)',
        'glow-primary': '0 0 20px rgba(99, 102, 241, 0.2)',
        'glow-secondary': '0 0 20px rgba(139, 92, 246, 0.15)',
      },
      backgroundImage: {
        'protocol-radial': 'radial-gradient(circle at 20% 20%, rgba(99, 102, 241, 0.08), transparent 42%), radial-gradient(circle at 85% 15%, rgba(139, 92, 246, 0.06), transparent 40%)',
        'chip-gradient': 'linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(139, 92, 246, 0.08))',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        pulseSoft: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(99, 102, 241, 0.25)' },
          '70%': { boxShadow: '0 0 0 10px rgba(99, 102, 241, 0)' },
        },
        drift: {
          '0%': { transform: 'translateX(0) translateY(0)' },
          '50%': { transform: 'translateX(18px) translateY(-10px)' },
          '100%': { transform: 'translateX(0) translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        'pulse-soft': 'pulseSoft 2.8s ease-in-out infinite',
        drift: 'drift 10s ease-in-out infinite',
        shimmer: 'shimmer 2.5s linear infinite',
      },
    },
  },
  plugins: [],
};

export default config;
