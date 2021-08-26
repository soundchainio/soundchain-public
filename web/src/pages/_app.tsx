import { CheckBodyScroll } from 'components/CheckBodyScroll';
import { StateProvider } from 'contexts';
import { ApolloProvider } from 'lib/apollo';
import type { AppProps } from 'next/app';
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
