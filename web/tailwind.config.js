module.exports = {
  mode: 'jit',
  purge: ['./src/**/*.{ts,tsx}'],
  darkMode: false, // or 'media' or 'class'
  plugins: [require('@tailwindcss/forms'), require('@tailwindcss/line-clamp')],
  theme: {
    extend: {
      fontSize: {
        xxs: '0.625rem',
      },
      fontFamily: {
        rubik: ['Rubik'],
      },
      dropShadow: {
        white: ['0px 0px 5px rgb(255,255,255)', '0px 0px 1px rgb(255,255,255)'],
      },
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
        green: {
          27: '#278E3140',
          52: '#52B23B40',
        },
      },
      backgroundSize: {
        'wave-size': '600% 600%',
      },
      keyframes: {
        wave: {
          '0%': {
            backgroundPosition: '0% 50%',
          },
          '50%': {
            backgroundPosition: '100% 50%',
          },
          '100%': {
            backgroundPosition: '0% 50%',
          },
        },
      },
      animation: {
        wave: 'wave 5s linear infinite',
      },
    },
  },
  variants: {
    extend: {
      borderWidth: ['last', 'odd'],
    },
  },
};
