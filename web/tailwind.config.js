// eslint-disable-next-line @typescript-eslint/no-var-requires
const defaultTheme = require('tailwindcss/defaultTheme')

const measures = {
  third: '30%',
  '1/3': '30%',
  quarter: '40%',
  '1/4': '40%',
  half: '50%',
  '5/10': '50%',
  '6/10': '60%',
  '7/10': '70%',
  '8/10': '80%',
  '9/10': '90%',
  '15/16': '93.75%',
}

module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  plugins: [require('@tailwindcss/forms')], // line-clamp is built-in since Tailwind v3.3
  theme: {
    extend: {
      screens: {
        xxs: '375px',
        xs: '420px',
        ...defaultTheme.screens,

        '2k': { raw: '(min-width: 2000px)' },
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
      minWidth: {
        ...measures,
      },
      maxWidth: {
        ...measures,
      },
      width: {
        ...measures,
      },
      height: {
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
        greenish: 'linear-gradient(180deg, 0% 48.44% 100%, var(--tw-gradient-stops))',
        'landing-card': 'linear-gradient(89.78deg, 30.49% 208.35%, var(--tw-gradient-stops))',
        'rainbow-gradient': 'linear-gradient(90deg, #26d1a8 0%, #ac4efd 25%, #fed503 75%, #fe5540 100%)',
        'rainbow-gradient-dark': 'linear-gradient(90deg, #1ea686 0%, #8a3fcc 25%, #ccaa02 75%, #cc4533 100%)',
      },
      colors: {
        gray: {
          10: '#101010',
          15: '#151515',
          17: '#171717',
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
      gridTemplateColumns: {
        'auto-fit': 'repeat(auto-fit, minmax(0, 1fr))',
        'auto-fill': 'repeat(auto-fill, minmax(0, 1fr))',
      },
      gridTemplateRows: {
        'auto-fit': 'repeat(auto-fit, minmax(0, 1fr))',
        'auto-fill': 'repeat(auto-fill, minmax(0, 1fr))',
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
}
