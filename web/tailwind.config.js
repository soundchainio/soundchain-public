module.exports = {
  purge: ['./src/**/*.{ts,tsx}'],
  darkMode: false, // or 'media' or 'class'
  plugins: [require('@tailwindcss/forms')],
  theme: {
    extend: {
      container: {
        center: true,
      },
      colors: {
        gray: {
          20: '#202020',
          30: '#303030',
          60: '#606060',
          80: '#808080',
        },
        'custom-black': {
          '1A': '#1A1A1A',
        },
      },
    },
  },
  variants: {
    extend: {},
  },
};
