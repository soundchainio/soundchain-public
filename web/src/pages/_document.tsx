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

    // Standalone pages (nodes etc) render inside ssr:false providers, so
    // their page-level <Head> NEVER reaches the server HTML — crawlers and
    // iMessage got a bare gray bubble. Inject share metas here at the
    // document level (always SSR'd), keyed on the route.
    const page = this.props.__NEXT_DATA__?.page
    const domain = process.env.NEXT_PUBLIC_DOMAIN_URL || 'https://soundchain.io'

    return (
      <Html>
        <Head>
          <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
          {page === '/nodes' && (
            <>
              <meta property="og:type" content="website" />
              <meta property="og:title" content="SoundChain Nodes — Flight Deck" />
              <meta property="og:description" content="The starship's working cockpit: live mesh nodes, tactical scope, annunciators. IPFS · Nostr · WebRTC · Polygon. Decentralized, free forever." />
              <meta property="og:image" content={`${domain}/og/nodes-flightdeck.png`} />
              <meta property="og:image:width" content="1200" />
              <meta property="og:image:height" content="630" />
              <meta property="og:url" content={`${domain}/nodes`} />
              <meta property="og:site_name" content="SoundChain | Decentralized Music Platform" />
              <meta name="twitter:card" content="summary_large_image" />
              <meta name="twitter:title" content="SoundChain Nodes — Flight Deck" />
              <meta name="twitter:image" content={`${domain}/og/nodes-flightdeck.png`} />
            </>
          )}
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
