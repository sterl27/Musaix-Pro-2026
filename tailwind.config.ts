import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/app/**/*.{ts,tsx}', './src/components/**/*.{ts,tsx}', './src/lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        accent: '#ee2b5b',
        violet: '#8b5cf6'
      }
    }
  },
  plugins: []
};

export default config;
