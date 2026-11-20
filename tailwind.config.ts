import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Automotive-palet. Bevidst UDEN "Claude"-blaa/groenne toner og UDEN
        // Zeekrs egne firmafarver (jura: ingen antydet tilknytning).
        grafit: {
          // Koel grafit/charcoal — basis for et rent, premium look.
          50: '#f7f8f8',
          100: '#eceef0',
          200: '#d5d9dd',
          300: '#b0b7bf',
          400: '#848d98',
          500: '#656e7a',
          600: '#505862',
          700: '#424851',
          800: '#262a30',
          900: '#17191d',
          950: '#0e0f12',
        },
        kobber: {
          // Varm kobber/bronze accent — primaer handling. Automotive, ikke neon.
          50: '#fcf5f0',
          100: '#f7e6d8',
          200: '#eec8ae',
          300: '#e3a37e',
          400: '#d67c4f',
          500: '#c2683f', // primaer
          600: '#a9522f',
          700: '#8a4028',
          800: '#703626',
          900: '#5d2f22',
        },
        // Daempet groen — KUN til "loest i OTA"-status (ikke neon, ikke Claude-groen).
        loest: '#4f6f4a',
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
