const measures = {
  '6/10': '60%',
  '7/10': '70%',
  '8/10': '80%',
  '9/10': '90%',
};

module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  plugins: [require('@tailwindcss/forms'), require('@tailwindcss/line-clamp')],
  theme: {
    extend: {
      screens: {
        vsm: { raw: '(min-height: 600px)' },
        vmd: { raw: '(min-height: 800px)' },
        vlg: { raw: '(min-height: 900px)' },
        vxl: { raw: '(min-height: 1200px)' },
        v2xl: { raw: '(min-height: 1500px)' },
      },
      fontSize: {
        xxs: '0.625rem',
      },
      fontFamily: {
        rubik: ['Rubik'],
      },
      height: {
        ...measures,
      },
      minHeight: {
        ...measures,
      },
      maxHeight: {
        ...measures,
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
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-radial-to-tr': 'radial-gradient(115% 90% at 0% 100%, var(--tw-gradient-stops))',
        'gradient-radial-to-tl': 'radial-gradient(115% 90% at 100% 100%, var(--tw-gradient-stops))',
        'gradient-radial-to-br': 'radial-gradient(90% 115% at 0% 0%, var(--tw-gradient-stops))',
        'gradient-radial-to-bl': 'radial-gradient(90% 115% at 100% 0%, var(--tw-gradient-stops))',
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
};
