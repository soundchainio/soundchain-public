module.exports = {
  mode: 'jit',
  purge: ['./src/**/*.{ts,tsx}'],
  darkMode: false, // or 'media' or 'class'
  plugins: [require('@tailwindcss/forms'), require('@tailwindcss/line-clamp')],
  theme: {
    extend: {
      flex: {
        2: '2 2 0%',
      },
      container: {
        center: true,
      },
      spacing: {
        full: '100%',
      },
      colors: {
        gray: {
          10: '#101010',
          15: '#151515',
          20: '#202020',
          25: '#252525',
          30: '#303030',
          35: '#353535',
          40: '#404040',
          50: '#505050',
          60: '#606060',
          80: '#808080',
          '1A': '#1A1A1A',
          CC: '#CCCCCC',
        },
      },
    },
  },
  variants: {
    extend: {
      borderWidth: ['last', 'odd'],
    },
  },
};
