import Document, { Html, Head, Main, NextScript, DocumentContext } from 'next/document'

/**
 * _document.tsx — customizes the server-rendered HTML shell.
 *
 * The inline `<script>` below reads `localStorage.soundchain_theme` + the
 * `prefers-color-scheme` media query and stamps `data-theme="dark|light"` on
 * <html> before the body paints. That kills the flash-of-wrong-theme when
 * a user has chosen Light or Auto→Light. Keep the default (`dark`) in sync
 * with `ThemeContext.tsx`.
 */
class SoundchainDocument extends Document {
  static async getInitialProps(ctx: DocumentContext) {
    return Document.getInitialProps(ctx)
  }

  render() {
    const themeInitScript = `
      (function() {
        try {
          var stored = localStorage.getItem('soundchain_theme');
          var choice = (stored === 'light' || stored === 'dark' || stored === 'auto') ? stored : 'dark';
          var resolved = choice;
          if (choice === 'auto') {
            resolved = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
          }
          document.documentElement.setAttribute('data-theme', resolved);
          document.documentElement.style.colorScheme = resolved;
        } catch (e) {
          document.documentElement.setAttribute('data-theme', 'dark');
        }
      })();
    `

    return (
      <Html>
        <Head>
          <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    )
  }
}

export default SoundchainDocument
