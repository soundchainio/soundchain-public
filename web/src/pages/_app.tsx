import { RepostModal } from 'components/RepostModal';
import { ModalsContext } from 'contexts/Modals';
import { RepostModalContext } from 'contexts/RepostModal';
import { ApolloProvider } from 'lib/apollo';
import type { AppProps } from 'next/app';
import { useState } from 'react';
import 'styles/globals.css';

function MyApp({ Component, pageProps }: AppProps) {
  const [anyModalOpened, setAnyModalOpened] = useState(false);
  const [showRepostModal, setShowRepostModal] = useState(false);
  const [repostId, setRepostId] = useState('');

  const modalsContextProps = { anyModalOpened, setAnyModalOpened };
  const repostModalContextProps = {
    showRepostModal,
    setShowRepostModal,
    repostId,
    setRepostId,
  };

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
    <ApolloProvider pageProps={pageProps}>
      <ModalsContext.Provider value={modalsContextProps}>
        <RepostModalContext.Provider value={repostModalContextProps}>
          <CheckBodyScroll />
          <Component {...pageProps} />
          <RepostModal />
        </RepostModalContext.Provider>
      </ModalsContext.Provider>
    </ApolloProvider>
  );
}
export default MyApp;
