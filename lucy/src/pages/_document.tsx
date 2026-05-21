import Document, { Html, Head, Main, NextScript } from 'next/document'

class LucyDocument extends Document {
  render() {
    return (
      <Html lang="en">
        <Head>
          <meta charSet="utf-8" />
          <meta name="theme-color" content="#05070d" />
          <link rel="icon" href="/favicon.ico" />
          <meta name="description" content="Lucy — SoundChain's AI surface. Local-first chat, vision, character design, generate." />
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
