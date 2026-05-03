/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // LIGHT (default) — clean stadium / racing program / paper white
        'arena-paper': '#fafafa',
        'arena-card': '#ffffff',
        'arena-border-l': '#e5e5e5',
        'arena-text-l': '#0a0a0a',
        'arena-muted-l': '#525252',

        // DARK (toggle) — true carbon black, warm grey surfaces, gunmetal borders
        'arena-carbon': '#0a0a0a',
        'arena-surface': '#1a1a1a',
        'arena-border-d': '#2a2a2a',
        'arena-text-d': '#fafafa',
        'arena-muted-d': '#a3a3a3',

        // Brand accents — work on BOTH light + dark (only neutrals invert)
        'arena-red': '#dc2626',
        'arena-red-soft': '#ef4444',
        'arena-orange': '#f97316',
        'arena-yellow': '#facc15',
      },
      fontFamily: {
        display: ['var(--font-titillium)', 'system-ui', 'sans-serif'],
        sans: ['var(--font-titillium)', 'system-ui', 'sans-serif'],
      },
      animation: {
        'arena-shimmer': 'arenaShimmer 6s linear infinite',
        'arena-pulse-live': 'arenaPulseLive 1.6s ease-in-out infinite',
      },
      keyframes: {
        arenaShimmer: {
          '0%': { backgroundPosition: '0% 50%' },
          '100%': { backgroundPosition: '200% 50%' },
        },
        arenaPulseLive: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.6', transform: 'scale(0.92)' },
        },
      },
    },
  },
  plugins: [],
}
