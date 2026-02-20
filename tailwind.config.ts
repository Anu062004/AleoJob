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
          bg: '#05070F',
          surface: '#0D111C',
          'surface-elevated': '#121A2A',
          primary: '#7C5CFF',
          secondary: '#00E5FF',
          text: '#E6EDF3',
          'text-muted': '#8B9BB0',
          border: 'rgba(139, 155, 176, 0.22)',
        },
        // Legacy aliases kept so existing components do not break.
        'bg-primary': '#05070F',
        'bg-secondary': '#0D111C',
        'bg-elevated': '#121A2A',
        'surface-main': '#05070F',
        'surface-card': '#0D111C',
        'surface-elevated': '#121A2A',
        'surface-hover': '#161E30',
        'text-primary': '#E6EDF3',
        'text-secondary': '#B9C7D8',
        'text-muted': '#8B9BB0',
        'border-subtle': 'rgba(139, 155, 176, 0.22)',
        'border-accent': 'rgba(124, 92, 255, 0.45)',
        'status-success': '#22C55E',
        'status-warning': '#F59E0B',
        'aleo-purple': '#7C5CFF',
        'aleo-purple-light': '#A18CFF',
      },
      fontFamily: {
        sans: ['Space Grotesk', 'Sora', 'Segoe UI', 'sans-serif'],
        mono: ['IBM Plex Mono', 'JetBrains Mono', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'card-soft': '0 12px 40px rgba(2, 8, 20, 0.45)',
        'card-glow': '0 0 0 1px rgba(124, 92, 255, 0.35), 0 16px 38px rgba(4, 8, 20, 0.5)',
        'glow-primary': '0 0 28px rgba(124, 92, 255, 0.28)',
        'glow-secondary': '0 0 28px rgba(0, 229, 255, 0.2)',
      },
      backgroundImage: {
        'protocol-radial': 'radial-gradient(circle at 20% 20%, rgba(124, 92, 255, 0.25), transparent 42%), radial-gradient(circle at 85% 15%, rgba(0, 229, 255, 0.18), transparent 40%), radial-gradient(circle at 50% 90%, rgba(124, 92, 255, 0.16), transparent 45%)',
        'chip-gradient': 'linear-gradient(135deg, rgba(124, 92, 255, 0.3), rgba(0, 229, 255, 0.2))',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        pulseSoft: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(124, 92, 255, 0.35)' },
          '70%': { boxShadow: '0 0 0 10px rgba(124, 92, 255, 0)' },
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
