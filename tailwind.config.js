/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './utils/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          light: '#f0f9ff',
          DEFAULT: '#2563eb',
          dark: '#1e3a8a',
        },
        secondary: {
          light: '#dcfce7',
          DEFAULT: '#16a34a',
          dark: '#065f46',
        },
      },
    },
  },
  plugins: [],
};