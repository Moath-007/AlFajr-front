/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#162E21',
          dark: '#0F1F16',
          50: '#EAF1ED',
          100: '#D4E3DB',
          200: '#A8C7B6',
          300: '#7BAB91',
          400: '#4F8F6C',
          500: '#2E6F4E',
          600: '#235840',
          700: '#1B4533',
          800: '#162E21',
          900: '#0F1F16',
        },
        gold: {
          DEFAULT: '#9C7537',
          light: '#B89A5E',
          dark: '#7A5A26',
          50: '#FAF6EE',
          100: '#F3EAD3',
          200: '#E6D4A6',
          300: '#D9BD79',
          400: '#C9A651',
          500: '#9C7537',
          600: '#7A5A26',
          700: '#5C441C',
        },
      },
      fontFamily: {
        sans: ['Tajawal', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(22,46,33,0.06), 0 1px 2px rgba(22,46,33,0.04)',
        cardHover: '0 10px 30px -10px rgba(22,46,33,0.18)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.25s ease-out',
        'slide-in': 'slide-in 0.25s ease-out',
        'scale-in': 'scale-in 0.15s ease-out',
      },
    },
  },
  plugins: [],
};
