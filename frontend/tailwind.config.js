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
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Fraunces"', 'ui-serif', 'Georgia', 'serif'],
      },
      boxShadow: {
        soft: '0 1px 2px rgba(23, 31, 77, 0.04), 0 8px 24px -8px rgba(23, 31, 77, 0.10)',
        card: '0 1px 3px rgba(23, 31, 77, 0.06), 0 1px 2px rgba(23, 31, 77, 0.04)',
        lifted: '0 20px 45px -15px rgba(23, 31, 77, 0.35)',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
      backgroundImage: {
        'grain-fade': 'linear-gradient(180deg, rgba(23,31,77,0) 0%, rgba(23,31,77,0.85) 100%)',
      },
      animation: {
        'fade-up': 'fadeUp 0.6s ease-out both',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
