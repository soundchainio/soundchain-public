import type { AppProps } from 'next/app'
import Head from 'next/head'
import '../styles/globals.css'

export default function ArenaApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1" />
        <meta name="theme-color" content="#0a0a0f" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Arena" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/arena-icon-192.png" />
      </Head>
      <Component {...pageProps} />
    </>
  )
}
