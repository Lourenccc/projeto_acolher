import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Verde-azulado acolhedor; brand-600+ tem contraste AA com texto branco.
        brand: {
          50: '#effaf8',
          100: '#d7f2ee',
          200: '#b0e4dc',
          300: '#7fcfc4',
          400: '#4fb3a8',
          500: '#33978d',
          600: '#277a73',
          700: '#23625d',
          800: '#204f4c',
          900: '#1e4240',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
