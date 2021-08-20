import { ModalsContext } from 'contexts/Modals';
import { ApolloProvider } from 'lib/apollo';
import type { AppProps } from 'next/app';
import { useState } from 'react';
import 'styles/globals.css';

function MyApp({ Component, pageProps }: AppProps) {
  const [anyModalOpened, setAnyModalOpened] = useState(false);

  const modalsContextProps = { anyModalOpened, setAnyModalOpened };

  const CheckBodyScroll = () => {
    return anyModalOpened ? (
      <style jsx global>{`
        body {
          overflow: hidden;
        }
      `}</style>
    ) : null;
  };

  return (
    <ApolloProvider>
      <ModalsContext.Provider value={modalsContextProps}>
        <CheckBodyScroll />
        <Component {...pageProps} />
      </ModalsContext.Provider>
    </ApolloProvider>
  );
}
export default MyApp;
