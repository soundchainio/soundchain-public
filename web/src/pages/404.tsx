import { BackButton } from 'components/Buttons/BackButton';
import { Layout } from 'components/Layout';
import { TopNavBarProps } from 'components/TopNavBar';
import { Sad } from 'icons/emoji/Sad';
import Head from 'next/head';
export default function Page404() {
  const topNavBarProps: TopNavBarProps = {
    leftButton: <BackButton />,
    title: '404 Error',
  };

  return (
    <Layout topNavBarProps={topNavBarProps}>
      <Head>
        <title>Soundchain - Not Found</title>
        <meta name="description" content="Explore" />
        <link rel="icon" href="/favicons/favicon.ico" />
      </Head>
      <div className="h-full w-full flex flex-col items-center justify-center">
        <Sad className="w-12" />
        <h1 className="text-xl text-white font-bold">404 Error</h1>
        <h3 className="text-lg text-gray-500 font-bold">This page does not exist.</h3>
      </div>
    </Layout>
  );
}
