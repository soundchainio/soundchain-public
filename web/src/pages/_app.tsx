import { ModalProvider } from "../contexts/ModalContext";
import 'regenerator-runtime/runtime'
import { CheckBodyScroll } from 'components/CheckBodyScroll'
import { Layout } from 'components/Layout'
import { config } from 'config'
import { StateProvider } from 'contexts'
import { PanelProvider } from 'contexts/PanelContext'
import { AudioPlayerProvider } from 'hooks/useAudioPlayer'
import { TrackProvider } from 'hooks/useTrack'
import { HideBottomNavBarProvider } from 'hooks/useHideBottomNavBar'
import { LayoutContextProvider } from 'hooks/useLayoutContext'
import { ApolloProvider } from 'lib/apollo'
import type { AppProps } from 'next/app'
import dynamic from 'next/dynamic'
import Head from 'next/head'
import Router from 'next/router'
import Script from 'next/script'
import NProgress from 'nprogress'
import { ReactElement } from 'react'
import 'react-toastify/dist/ReactToastify.css'
import 'styles/audio-player.css'
import 'styles/bottom-audio-player.css'
import 'styles/globals.css'
import 'styles/loading-ring.css'
import 'styles/nprogress.css'
import 'styles/track-card.css'
import 'styles/volume-slider.css'

const WalletProvider = dynamic(() => import('hooks/useWalletContext'), { ssr: false })
const MagicProvider = dynamic(() => import('hooks/useMagicContext'), { ssr: false })
const Web3ModalProvider = dynamic(() => import('contexts/Web3ModalContext').then(mod => mod.Web3ModalProvider), { ssr: false })
const UnifiedWalletProvider = dynamic(() => import('contexts/UnifiedWalletContext').then(mod => mod.UnifiedWalletProvider), { ssr: false })

NProgress.configure({
  showSpinner: false,
})

Router.events.on('routeChangeStart', NProgress.start)
Router.events.on('routeChangeComplete', NProgress.done)
Router.events.on('routeChangeError', NProgress.done)

export type CustomLayout = (page: ReactElement) => ReactElement

interface CustomAppProps extends Pick<AppProps, 'Component' | 'pageProps'> {
  Component: AppProps['Component'] & {
    getLayout?: CustomLayout
  }
}

function SoundchainMainLayout({ Component, pageProps }: CustomAppProps) {
  return (
    <ApolloProvider pageProps={pageProps}>
      <Web3ModalProvider>
        <ModalProvider>
          <StateProvider>
            <PanelProvider>
              <MagicProvider>
                <WalletProvider>
                  <UnifiedWalletProvider>
                    <AudioPlayerProvider>
                    <TrackProvider>
                      <HideBottomNavBarProvider>
                        <LayoutContextProvider>
                          <CheckBodyScroll />
                          <Layout>
                            <Component {...pageProps} />
                          </Layout>
                        </LayoutContextProvider>
                      </HideBottomNavBarProvider>
                    </TrackProvider>
                  </AudioPlayerProvider>
                  </UnifiedWalletProvider>
                </WalletProvider>
              </MagicProvider>
            </PanelProvider>
          </StateProvider>
        </ModalProvider>
      </Web3ModalProvider>
    </ApolloProvider>
  )
}

function SoundchainPageLayout({ Component, pageProps }: CustomAppProps) {
  if (!Component.getLayout) return <></>
  return (
    <ApolloProvider pageProps={pageProps}>
      <MagicProvider>
        <WalletProvider>
          {Component.getLayout(<Component {...pageProps} />)}
        </WalletProvider>
      </MagicProvider>
    </ApolloProvider>
  )
}

function SoundchainApp({ Component, pageProps }: CustomAppProps) {
  return (
    <>
      <Head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, viewport-fit=cover" />
        <meta name="theme-color" content="#000000" />
        <link rel="icon" href="/favicons/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/favicons/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicons/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicons/favicon-16x16.png" />
        <link rel="mask-icon" href="/favicons/safari-pinned-tab.svg" color="#5bbad5" />
        <meta name="msapplication-TileColor" content="#da532c" />
        <link rel="manifest" href="/manifest.json"></link>
        <Script
          async
          strategy="afterInteractive"
          src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_ANALYTICS_ID}`}
        />
        <Script
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${process.env.NEXT_PUBLIC_ANALYTICS_ID}');
            `,
          }}
        />
      </Head>
      {Component.getLayout ? (
        <SoundchainPageLayout Component={Component} pageProps={pageProps} />
      ) : (
        <SoundchainMainLayout Component={Component} pageProps={pageProps} />
      )}
    </>
  )
}

export default SoundchainApp