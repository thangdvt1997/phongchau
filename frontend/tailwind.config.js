/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f2f8ee',
          100: '#e0eed4',
          500: '#4c7a2f',
          600: '#3d6225',
          700: '#2f4c1d',
          900: '#1c2e12',
        },
      },
    },
  },
  plugins: [],
};
