import { useLayoutContext } from 'hooks/useLayoutContext';
import { Sad } from 'icons/emoji/Sad';
import Head from 'next/head';
import { useEffect } from 'react';

export default function Page404() {
  const { setTopNavBarProps } = useLayoutContext();

  useEffect(() => {
    setTopNavBarProps({ title: '404 Error' });
  }, [setTopNavBarProps]);

  return (
    <>
      <Head>
        <title>Not Found | SoundChain</title>
        <meta name="description" content="This page does not exist." />
        <link rel="icon" href="/favicons/favicon.ico" />
      </Head>
      <div className="h-full w-full flex flex-col items-center justify-center">
        <Sad className="w-12" />
        <h1 className="text-xl text-white font-bold">404 Error</h1>
        <h3 className="text-lg text-gray-500 font-bold">This page does not exist.</h3>
      </div>
    </>
  );
}
