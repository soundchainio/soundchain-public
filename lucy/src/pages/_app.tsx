import { useEffect } from 'react'
import type { AppProps } from 'next/app'
import 'styles/globals.css'
import { initNativeShell } from 'lib/nativeBridge'

export default function App({ Component, pageProps }: AppProps) {
  // Engage native superpowers when running inside the Lucy droid shell.
  // No-op in a normal browser tab.
  useEffect(() => {
    initNativeShell()
  }, [])

  return <Component {...pageProps} />
}
