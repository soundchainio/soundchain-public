import { BackButton } from 'components/Buttons/BackButton';
import { Layout } from 'components/Layout';
import { TopNavBarProps } from 'components/TopNavBar';
import { TopTracks } from 'components/TopTracks';
import { cacheFor } from 'lib/apollo';
import { protectPage } from 'lib/protectPage';
import Head from 'next/head';
import React from 'react';

export const getServerSideProps = protectPage((context, apolloClient) => {
  return cacheFor(TopTracksPage, {}, context, apolloClient);
});

export default function TopTracksPage() {
  const topNavBarProps: TopNavBarProps = {
    leftButton: <BackButton />,
  };

  return (
    <Layout topNavBarProps={topNavBarProps}>
      <Head>
        <title>Soundchain / Top 100 tracks</title>
        <meta name="description" content="Top 100 tracks" />
        <link rel="icon" href="/favicons/favicon.ico" />
      </Head>
      <div className="flex flex-col justify-center items-center px-11 py-7">
        <h1 className="yellow-gradient-text text-4xl font-bold uppercase">Top 100</h1>
        <h2 className="text-gray-80 text-xs font-bold text-center">
          Top 100 tracks on the SoundChain platform by stream count.
        </h2>
      </div>
      <TopTracks />
    </Layout>
  );
}
