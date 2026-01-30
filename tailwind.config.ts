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
        // Premium dark backgrounds
        'bg-primary': '#0A0A0F',
        'bg-secondary': '#111118',
        'bg-elevated': '#1A1A24',
        'bg-hover': '#242430',
        // Accent colors - elegant indigo/cyan
        'accent-primary': '#6366F1',
        'accent-primary-hover': '#818CF8',
        'accent-secondary': '#06B6D4',
        'accent-muted': '#475569',
        // Legacy Aleo colors for compatibility
        'aleo-purple': '#6366F1',
        'aleo-purple-light': '#818CF8',
        // Text colors
        'text-primary': '#F8FAFC',
        'text-secondary': '#CBD5E1',
        'text-muted': '#94A3B8',
        'text-disabled': '#64748B',
        // Status colors
        'success': '#10B981',
        'warning': '#F59E0B',
        'error': '#EF4444',
        'info': '#3B82F6',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      fontSize: {
        'display': ['4.5rem', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
        'display-sm': ['3rem', { lineHeight: '1.2', letterSpacing: '-0.02em' }],
      },
      borderRadius: {
        'xl': '12px',
        '2xl': '16px',
        '3xl': '20px',
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.3), 0 1px 2px -1px rgba(0, 0, 0, 0.3)',
        'card-hover': '0 8px 24px -4px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(99, 102, 241, 0.1)',
        'lg': '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
        'xl': '0 20px 40px -10px rgba(0, 0, 0, 0.6)',
        'glow': '0 0 20px rgba(99, 102, 241, 0.15)',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
    },
  },
  plugins: [],
};

export default config;
