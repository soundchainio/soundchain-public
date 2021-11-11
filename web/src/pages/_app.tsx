import '@reach/dialog/styles.css';
import '@reach/slider/styles.css';
import * as Sentry from '@sentry/react';
import { Integrations } from '@sentry/tracing';
import { BottomAudioPlayer } from 'components/BottomAudioPlayer';
import { BottomNavBarWrapper } from 'components/BottomNavBarWrapper';
import { CheckBodyScroll } from 'components/CheckBodyScroll';
import { Favicons } from 'components/Favicons';
import { AudioPlayerModal } from 'components/modals/AudioPlayerModal';
import { CreateModal } from 'components/modals/CreateModal';
import { StateProvider } from 'contexts';
import { AudioPlayerProvider } from 'hooks/useAudioPlayer';
import { HideBottomNavBarProvider } from 'hooks/useHideBottomNavBar';
import WalletProvider from 'hooks/useWalletContext';
import { ApolloProvider } from 'lib/apollo';
import type { AppProps } from 'next/app';
import dynamic from 'next/dynamic';
import Head from 'next/head';
import Router from 'next/router';
import NProgress from 'nprogress';
import React from 'react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import 'styles/audio-player.css';
import 'styles/bottom-audio-player.css';
import 'styles/globals.css';
import 'styles/loading-ring.css';
import 'styles/nprogress.css';

Sentry.init({
  dsn: 'https://43ff4c65582f427a8bf2dc33efd1c2fa@o1011186.ingest.sentry.io/5977714',
  integrations: [new Integrations.BrowserTracing()],
  tracesSampleRate: 1.0,
});

NProgress.configure({
  showSpinner: false,
});

Router.events.on('routeChangeStart', NProgress.start);
Router.events.on('routeChangeComplete', NProgress.done);
Router.events.on('routeChangeError', NProgress.done);

const MagicProvider = dynamic(() => import('hooks/useMagicContext'), { ssr: false });

function SoundchainApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no viewport-fit=cover"
        />
        <meta name="theme-color" content="#000000" />
        <Favicons />
        <link rel="manifest" href="/manifest.json"></link>
      </Head>
      <ApolloProvider pageProps={pageProps}>
        <StateProvider>
          <MagicProvider>
            <WalletProvider>
              <AudioPlayerProvider>
                <HideBottomNavBarProvider>
                  <CheckBodyScroll />
                  <div className="h-full flex flex-col">
                    <div className="flex-1 max-h-full overflow-y-auto">
                      <Component {...pageProps} />
                    </div>
                    <BottomAudioPlayer />
                    <BottomNavBarWrapper />
                    <CreateModal />
                    <AudioPlayerModal />
                    <ToastContainer
                      position="top-right"
                      autoClose={1200}
                      closeButton={false}
                      hideProgressBar
                      closeOnClick
                      toastStyle={{ backgroundColor: '#202020', color: 'white', textAlign: 'center' }}
                    />
                  </div>
                </HideBottomNavBarProvider>
              </AudioPlayerProvider>
            </WalletProvider>
          </MagicProvider>
        </StateProvider>
      </ApolloProvider>
    </>
  );
}
export default SoundchainApp;
