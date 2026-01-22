import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'aleo-purple': '#8B5CF6',
        'aleo-purple-light': '#A78BFA',
        'aleo-midnight': '#0F172A',
        'aleo-midnight-light': '#1E293B',
        'aleo-cyan': '#06B6D4',
        'aleo-emerald': '#10B981',
        aleo: {
          purple: '#8B5CF6',
          'purple-light': '#A78BFA',
          midnight: '#0F172A',
          'midnight-light': '#1E293B',
          cyan: '#06B6D4',
          emerald: '#10B981',
        },
      },
      backgroundImage: {
        'gradient-aleo': 'linear-gradient(135deg, #0F172A 0%, #4C1D95 50%, #0F172A 100%)',
      },
      animation: {
        'glow': 'glow 2s ease-in-out infinite alternate',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px #8B5CF6, 0 0 10px #8B5CF6' },
          '100%': { boxShadow: '0 0 20px #8B5CF6, 0 0 30px #8B5CF6' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};

export default config;
