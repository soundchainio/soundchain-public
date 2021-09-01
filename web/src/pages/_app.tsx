import { CheckBodyScroll } from 'components/CheckBodyScroll';
import { StateProvider } from 'contexts';
import { ApolloProvider } from 'lib/apollo';
import type { AppProps } from 'next/app';
import 'styles/globals.css';
import Head from 'next/head';

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
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
