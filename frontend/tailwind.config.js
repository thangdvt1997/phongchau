/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // Sampled directly from logo.pdf (indigo/blue wave mark) — keep in sync with the logo.
        brand: {
          50: '#eef2fb',
          100: '#d7e1f5',
          200: '#afc3eb',
          300: '#7fa0dd',
          400: '#4a72be',
          500: '#2f5ea2',
          600: '#26479a',
          700: '#293d92',
          800: '#202f70',
          900: '#171f4d',
        },
        accent: {
          500: '#1772ba',
        },
      },
    },
  },
  plugins: [],
};
