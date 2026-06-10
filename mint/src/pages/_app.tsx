import type { AppProps } from 'next/app'
import Head from 'next/head'
import { WalletProvider } from 'contexts/WalletProvider'
import { MintPlayerProvider } from 'contexts/MintPlayerProvider'
import { FooterPlayer } from 'components/FooterPlayer'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import 'styles/globals.css'

export default function MintApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>SoundChain Mint — Forge music NFTs</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="description" content="The SoundChain forge. Mint music NFT editions, trade, stake. Spun off from soundchain.io." />
        <meta name="theme-color" content="#050708" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <WalletProvider>
        <MintPlayerProvider>
          <Component {...pageProps} />
          <FooterPlayer />
        </MintPlayerProvider>
        <ToastContainer position="bottom-center" theme="dark" newestOnTop limit={3} />
      </WalletProvider>
    </>
  )
}
