import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // IMQ Labs palette — black canvas, red primary, gold accent.
        ink: {
          900: '#06060A',
          800: '#0B0B12',
          700: '#11111A',
          600: '#181823',
          500: '#1F1F2E',
          400: '#2A2A3A',
        },
        wave: {
          50:  '#FFE5E5',
          100: '#FFB3B3',
          400: '#FF3344',
          500: '#FF1A2E',  // primary CTA red
          600: '#E60014',
          700: '#A30010',
        },
        gold: {
          400: '#F5C04A',
          500: '#D4A848',
          600: '#A88336',
        },
        text: {
          DEFAULT: '#F5F5FA',
          muted:   '#9A9AAE',
          dim:     '#5C5C70',
        },
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        display: ['ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '20px',
        '3xl': '28px',
      },
      boxShadow: {
        'fab': '0 12px 32px -8px rgba(255, 26, 46, 0.55)',
        'card': '0 8px 24px -12px rgba(0,0,0,0.6)',
      },
    },
  },
  plugins: [],
} satisfies Config;
