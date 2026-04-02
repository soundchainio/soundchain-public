import { AgentManagerProvider } from 'hooks/useAgentManager'
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
import { HeartbeatProvider } from 'hooks/useHeartbeat'
import { ApolloProvider } from 'lib/apollo'
import type { AppProps } from 'next/app'
import dynamic from 'next/dynamic'
import Head from 'next/head'
import Router, { useRouter } from 'next/router'
import Script from 'next/script'
import NProgress from 'nprogress'
import React, { ReactElement } from 'react'
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
const RadioProvider = dynamic(() => import('contexts/RadioContext').then(mod => mod.RadioProvider), { ssr: false })
const PushEnableFloat = dynamic(() => import('components/PushEnableFloat').then(mod => mod.PushEnableFloat), { ssr: false })

// Capacitor native app detection and safe area handling
const CapacitorInit = dynamic(() => import('hooks/useCapacitor').then(mod => {
  // Return a component that uses the hook
  const CapacitorInitComponent = () => {
    mod.useCapacitor();
    return null;
  };
  return CapacitorInitComponent;
}), { ssr: false })

// PWA-safe error boundary — catches crashes, shows error on screen (no console needed),
// and provides "Clear Cache & Reload" to escape stale service worker death spiral.
class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null; clearing: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null, clearing: false }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[AppErrorBoundary]', error, errorInfo)
  }

  handleClearCacheAndReload = async () => {
    this.setState({ clearing: true })
    try {
      // Unregister all service workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations()
        await Promise.all(registrations.map((r) => r.unregister()))
      }
      // Clear all caches
      if ('caches' in window) {
        const names = await caches.keys()
        await Promise.all(names.map((n) => caches.delete(n)))
      }
    } catch {
      // best effort
    }
    // Hard reload from network — use cache-busted URL to bypass any remaining cache
    const url = new URL(window.location.href)
    url.searchParams.set('_cb', Date.now().toString())
    window.location.replace(url.toString())
  }

  render() {
    if (this.state.hasError) {
      const msg = this.state.error?.message || 'Unknown error'
      const stack = this.state.error?.stack?.split('\n').slice(0, 4).join('\n') || ''
      return (
        <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif', background: '#0b141a', color: '#e9edef', minHeight: '100vh' }}>
          <h2 style={{ color: '#ff6b6b', fontSize: 18, marginBottom: 12 }}>SoundChain crashed</h2>
          <p style={{ fontSize: 13, color: '#8696a0', marginBottom: 8 }}>
            Screenshot this and send it so we can fix it:
          </p>
          <pre style={{ fontSize: 11, color: '#ff9999', background: '#111b21', padding: 12, borderRadius: 8, overflow: 'auto', maxHeight: 200, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {msg}{'\n'}{stack}
          </pre>
          <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
            <button
              onClick={this.handleClearCacheAndReload}
              disabled={this.state.clearing}
              style={{ padding: '12px 20px', background: '#00a884', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
            >
              {this.state.clearing ? 'Clearing...' : 'Clear Cache & Reload'}
            </button>
            <button
              onClick={() => window.location.reload()}
              style={{ padding: '12px 20px', background: '#1f2c34', color: '#e9edef', border: '1px solid #2a3942', borderRadius: 8, fontSize: 14, cursor: 'pointer' }}
            >
              Reload
            </button>
          </div>
          <p style={{ fontSize: 11, color: '#8696a0', marginTop: 16 }}>
            If this keeps happening after Clear Cache, close the app completely (swipe up from app switcher) and reopen.
          </p>
        </div>
      )
    }
    return this.props.children
  }
}

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
    ssrOnly?: boolean // Pages with this flag bypass client-only providers
  }
}

function SoundchainMainLayout({ Component, pageProps }: CustomAppProps) {
  return (
    <AgentManagerProvider>
    <ApolloProvider pageProps={pageProps}>
      <MagicProvider>
        {/* Web3Modal AFTER MagicProvider to avoid iframe race condition */}
        <Web3ModalProvider>
          <ModalProvider>
            <StateProvider>
              <PanelProvider>
                <WalletProvider>
                  <UnifiedWalletProvider>
                    <AudioPlayerProvider>
                    <RadioProvider>
                    <TrackProvider>
                      <HideBottomNavBarProvider>
                        <LayoutContextProvider>
                          <CheckBodyScroll />
                          <CapacitorInit />
                          <HeartbeatProvider />
                          <PushEnableFloat />
                          <Layout>
                            <Component {...pageProps} />
                          </Layout>
                        </LayoutContextProvider>
                      </HideBottomNavBarProvider>
                    </TrackProvider>
                    </RadioProvider>
                  </AudioPlayerProvider>
                  </UnifiedWalletProvider>
                </WalletProvider>
              </PanelProvider>
            </StateProvider>
          </ModalProvider>
        </Web3ModalProvider>
      </MagicProvider>
    </ApolloProvider>
    </AgentManagerProvider>
  )
}

function SoundchainPageLayout({ Component, pageProps }: CustomAppProps) {
  if (!Component.getLayout) return <></>
  return (
    <ApolloProvider pageProps={pageProps}>
      <MagicProvider>
        <ModalProvider>
          <WalletProvider>
            {Component.getLayout(<Component {...pageProps} />)}
          </WalletProvider>
        </ModalProvider>
      </MagicProvider>
    </ApolloProvider>
  )
}

// SSR-only layout for pages that need full server-side rendering (e.g., for OG tags)
function SoundchainSSRLayout({ Component, pageProps }: CustomAppProps) {
  return <Component {...pageProps} />
}

function SoundchainApp({ Component, pageProps }: CustomAppProps) {
  const router = useRouter()
  // Pulse has its own PWA manifest — don't include the main manifest on Pulse pages
  const isPulsePage = router.pathname === '/dex/pulse'

  // SSR-only pages bypass all client-only providers for full server rendering
  // This includes pages with ssrOnly flag OR pages with isBot in pageProps
  if (Component.ssrOnly || pageProps?.isBot) {
    return <SoundchainSSRLayout Component={Component} pageProps={pageProps} />
  }

  return (
    <>
      <Head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
        <meta name="theme-color" content={isPulsePage ? '#00a884' : '#000000'} />
        <link rel="icon" href="/favicons/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/favicons/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicons/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicons/favicon-16x16.png" />
        <link rel="mask-icon" href="/favicons/safari-pinned-tab.svg" color="#5bbad5" />
        <meta name="msapplication-TileColor" content="#da532c" />
        {!isPulsePage && <link key="main-manifest" rel="manifest" href="/manifest.json" />}
        {isPulsePage && <link key="pulse-manifest" rel="manifest" href="/pulse-manifest.json?v=3" />}
        <meta name="apple-mobile-web-app-title" content={isPulsePage ? 'SoundChain Pulse' : 'SoundChain'} />
        <meta name="application-name" content={isPulsePage ? 'SoundChain Pulse' : 'SoundChain'} />
        {/* PWA recovery: catch chunk loading failures from stale service worker cache */}
        <Script
          id="pwa-recovery"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.__SC_RECOVERY_ATTEMPTED = false;
              window.addEventListener('error', function(e) {
                if (window.__SC_RECOVERY_ATTEMPTED) return;
                var isChunkError = e.message && (
                  e.message.indexOf('Loading chunk') !== -1 ||
                  e.message.indexOf('ChunkLoadError') !== -1 ||
                  e.message.indexOf('Loading CSS chunk') !== -1
                );
                var isModuleError = e.message && e.message.indexOf('Failed to fetch dynamically imported module') !== -1;
                if (isChunkError || isModuleError) {
                  window.__SC_RECOVERY_ATTEMPTED = true;
                  if ('caches' in window) {
                    caches.keys().then(function(names) {
                      return Promise.all(names.map(function(n) { return caches.delete(n); }));
                    }).then(function() {
                      window.location.reload();
                    });
                  } else {
                    window.location.reload();
                  }
                }
              });
            `,
          }}
        />
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
      {process.env.NEXT_PUBLIC_ADSENSE_PUB_ID && (
        <Script
          async
          strategy="afterInteractive"
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${process.env.NEXT_PUBLIC_ADSENSE_PUB_ID}`}
          crossOrigin="anonymous"
        />
      )}
      <AppErrorBoundary>
        {Component.getLayout ? (
          <SoundchainPageLayout Component={Component} pageProps={pageProps} />
        ) : (
          <SoundchainMainLayout Component={Component} pageProps={pageProps} />
        )}
      </AppErrorBoundary>
    </>
  )
}

export default SoundchainApp