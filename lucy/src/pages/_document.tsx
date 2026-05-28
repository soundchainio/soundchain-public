import Document, { Html, Head, Main, NextScript } from 'next/document'

class LucyDocument extends Document {
  render() {
    return (
      <Html lang="en">
        <Head>
          <meta charSet="utf-8" />
          <meta name="theme-color" content="#05070d" />
          <meta name="description" content="Lucy — SoundChain's AI surface. Local-first chat, vision, character design, generate." />

          {/* PWA — installable web app (Add to Home Screen) */}
          <link rel="manifest" href="/manifest.webmanifest" />
          <meta name="application-name" content="Lucy" />

          {/* Apple — standalone home-screen app + notch handling */}
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
          <meta name="apple-mobile-web-app-title" content="Lucy" />
          <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />

          {/* Favicons */}
          <link rel="icon" href="/favicon.ico" sizes="any" />
          <link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32.png" />
          <link rel="icon" type="image/png" sizes="16x16" href="/icons/favicon-16.png" />
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    )
  }
}

export default LucyDocument
