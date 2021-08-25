import { CheckBodyScroll } from 'components/CheckBodyScroll';
import { ApolloProvider } from 'lib/apollo';
import type { AppProps } from 'next/app';
import { StateProvider } from 'contexts';
import 'styles/globals.css';

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <ApolloProvider pageProps={pageProps}>
      <StateProvider>
        <CheckBodyScroll />
        <Component {...pageProps} />
      </StateProvider>
    </ApolloProvider>
  );
}
export default MyApp;
