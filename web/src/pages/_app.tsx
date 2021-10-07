import * as Sentry from '@sentry/react';
import { Integrations } from '@sentry/tracing';
import { CheckBodyScroll } from 'components/CheckBodyScroll';
import { Favicons } from 'components/Favicons';
import { StateProvider } from 'contexts';
import { MagicProvider } from 'hooks/useMagicContext';
import { ApolloProvider } from 'lib/apollo';
import type { AppProps } from 'next/app';
import Head from 'next/head';
import Router from 'next/router';
import NProgress from 'nprogress';
import 'styles/AudioPlayer.css';
import 'styles/globals.css';
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

function SoundchainApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <Favicons />
        <link rel="manifest" href="/manifest.json"></link>
      </Head>
      <ApolloProvider pageProps={pageProps}>
        <StateProvider>
          <MagicProvider>
            <CheckBodyScroll />
            <Component {...pageProps} />
          </MagicProvider>
        </StateProvider>
      </ApolloProvider>
    </>
  );
}
export default SoundchainApp;
