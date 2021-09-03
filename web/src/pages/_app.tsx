import { CheckBodyScroll } from 'components/CheckBodyScroll';
import { StateProvider } from 'contexts';
import { ApolloProvider } from 'lib/apollo';
import type { AppProps } from 'next/app';
import Head from 'next/head';
import 'styles/globals.css';

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
