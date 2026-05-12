/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/pages/**/*.{js,ts,jsx,tsx}', './src/components/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Mint brand palette — electric green + violet, the NFT/forge identity.
        mint: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
        },
        forge: {
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
        },
        // Cyberpunk neon accents — used for borders, glows, and stat readouts.
        neon: {
          cyan: '#00f0ff',
          magenta: '#ff2bd6',
          amber: '#ffb800',
          lime: '#caff00',
          rose: '#ff3366',
        },
        ink: {
          900: '#050708',
          800: '#0a0e12',
          700: '#0f141a',
          600: '#161d26',
          500: '#1f2937',
        },
      },
      fontFamily: {
        display: ['ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"SF Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        'neon-cyan': '0 0 18px rgba(0,240,255,0.45), inset 0 0 12px rgba(0,240,255,0.12)',
        'neon-magenta': '0 0 18px rgba(255,43,214,0.45), inset 0 0 12px rgba(255,43,214,0.12)',
        'neon-mint': '0 0 18px rgba(52,211,153,0.5), inset 0 0 12px rgba(52,211,153,0.12)',
        'neon-soft': '0 0 32px rgba(0,240,255,0.18)',
      },
      backgroundImage: {
        'grid-neon':
          'linear-gradient(rgba(0,240,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(0,240,255,0.06) 1px, transparent 1px)',
        'scanlines':
          'repeating-linear-gradient(180deg, rgba(255,255,255,0.018) 0 1px, transparent 1px 3px)',
        'holo-sweep':
          'linear-gradient(115deg, transparent 30%, rgba(0,240,255,0.08) 45%, rgba(255,43,214,0.08) 55%, transparent 70%)',
      },
      backgroundSize: {
        'grid-tile': '40px 40px',
      },
      keyframes: {
        'pulse-neon': {
          '0%, 100%': { opacity: '0.7', boxShadow: '0 0 8px rgba(0,240,255,0.4)' },
          '50%': { opacity: '1', boxShadow: '0 0 22px rgba(0,240,255,0.85)' },
        },
        'sweep': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(200%)' },
        },
        'flicker': {
          '0%, 100%': { opacity: '1' },
          '47%': { opacity: '1' },
          '48%': { opacity: '0.4' },
          '49%': { opacity: '1' },
          '92%': { opacity: '0.6' },
          '93%': { opacity: '1' },
        },
        'scan-y': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
      },
      animation: {
        'pulse-neon': 'pulse-neon 2.4s ease-in-out infinite',
        'sweep': 'sweep 3.2s linear infinite',
        'flicker': 'flicker 4s ease-in-out infinite',
        'scan-y': 'scan-y 8s linear infinite',
      },
    },
  },
  plugins: [],
}
