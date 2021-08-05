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
          80: '#808080',
        },
      },
    },
  },
  variants: {
    extend: {},
  },
};
