import { ModalsContext } from 'contexts/Modals';
import { NewPostModalContext } from 'contexts/NewPostModal';
import { ApolloProvider } from 'lib/apollo';
import type { AppProps } from 'next/app';
import { useState } from 'react';
import 'styles/globals.css';

function MyApp({ Component, pageProps }: AppProps) {
  const [anyModalOpened, setAnyModalOpened] = useState(false);
  const [showNewPost, setShowNewPost] = useState(false);
  const [repostId, setRepostId] = useState('');

  const modalsContextProps = { anyModalOpened, setAnyModalOpened };
  const newPostModalContextProps = {
    showNewPost,
    setShowNewPost,
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
        <NewPostModalContext.Provider value={newPostModalContextProps}>
          <CheckBodyScroll />
          <Component {...pageProps} />
        </NewPostModalContext.Provider>
      </ModalsContext.Provider>
    </ApolloProvider>
  );
}
export default MyApp;
