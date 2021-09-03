import { CheckBodyScroll } from 'components/CheckBodyScroll';
import { StateProvider } from 'contexts';
import { ApolloProvider } from 'lib/apollo';
import type { AppProps } from 'next/app';
import Head from 'next/head';
import Router from 'next/router';
import NProgress from 'nprogress';
import 'styles/globals.css';
import 'styles/nprogress.css';

NProgress.configure({
  showSpinner: false,
});

Router.events.on('routeChangeStart', NProgress.start);
Router.events.on('routeChangeComplete', NProgress.done);
Router.events.on('routeChangeError', NProgress.done);

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="apple-touch-icon" href="/soundchain-app-icon.png" />
      </Head>
      <ApolloProvider pageProps={pageProps}>
        <StateProvider>
          <CheckBodyScroll />
          <Component {...pageProps} />
        </StateProvider>
      </ApolloProvider>
    </>
  );
}
export default MyApp;
