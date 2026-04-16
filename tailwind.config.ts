import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#F8F8F8',
        surface: '#FFFFFF',
        primary: '#D97450',
        textMain: '#333333',
        textMuted: '#666666',
        borderInner: '#E5E5E5',
        borderOuter: '#D4D4D4',
        accent: '#D97450',
        success: '#059669',
        error: '#DC2626',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'sans-serif'],
        serif: ['var(--font-serif)', 'serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      borderRadius: {
        lg: '0.75rem',
        xl: '1rem',
        '2xl': '1.5rem',
      },
      animation: {
        'slide-up': 'slide-up 0.4s ease-out forwards',
        'fade-in': 'fade-in 0.5s ease-out forwards',
        'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
        'spin': 'spin 1s linear infinite',
        'fill-bar': 'fill-bar 1.2s ease-out forwards',
      },
      keyframes: {
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'none' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
        'fill-bar': {
          from: { width: '0%' },
          to: { width: 'var(--fill-width)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
