import { Html, Head, Main, NextScript } from 'next/document'

const themeInitScript = `
(function() {
  try {
    var stored = localStorage.getItem('arenaTheme');
    if (stored === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      // Light by default — ignore prefers-color-scheme. Operator directive May 2 2026.
      document.documentElement.classList.remove('dark');
    }
  } catch (_) {
    // localStorage unavailable (Capacitor edge cases) — fall back to light
    document.documentElement.classList.remove('dark');
  }
})();
`

export default function ArenaDocument() {
  return (
    <Html lang="en">
      <Head />
      <body className="bg-arena-paper dark:bg-arena-carbon text-arena-text-l dark:text-arena-text-d">
        {/* Run BEFORE paint — eliminates light/dark FOUC */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
