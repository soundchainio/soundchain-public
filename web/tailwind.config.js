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
          25: '#252525',
          30: '#303030',
          40: '#404040',
          60: '#606060',
          80: '#808080',
        },
        'custom-black': {
          10: '#101010',
          '1A': '#1A1A1A',
        },
      },
    },
  },
  variants: {
    extend: {},
  },
};
