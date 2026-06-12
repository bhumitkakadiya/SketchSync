/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#f0f4ff',
          100: '#e0e9ff',
          200: '#c7d6fd',
          300: '#a5b8fc',
          400: '#8190f8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b',
        },
        surface: {
          0:   '#0f0f14',
          50:  '#16161f',
          100: '#1c1c28',
          200: '#222233',
          300: '#2a2a3d',
          400: '#333348',
        },
        'surface-light': {
          0:   '#f0f2f8',
          50:  '#f8f9fc',
          100: '#ffffff',
          200: '#e8eaf2',
          300: '#d8dae8',
          400: '#b0b3c8',
        },
        canvas: {
          bg: '#f8f9ff',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
        'cursor-blink': 'blink 1s step-end infinite',
      },
      keyframes: {
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: 'translateY(16px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        slideInRight: { from: { opacity: 0, transform: 'translateX(16px)' }, to: { opacity: 1, transform: 'translateX(0)' } },
        pulseSoft: { '0%, 100%': { opacity: 1 }, '50%': { opacity: 0.6 } },
        blink: { '0%, 100%': { opacity: 1 }, '50%': { opacity: 0 } },
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'glow-brand': '0 0 20px rgba(99, 102, 241, 0.4)',
        'glow-sm': '0 0 10px rgba(99, 102, 241, 0.2)',
        'glass': '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
      },
    },
  },
  plugins: [],
}
