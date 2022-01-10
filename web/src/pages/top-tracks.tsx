import { BackButton } from 'components/Buttons/BackButton';
import { Layout } from 'components/Layout';
import SEO from 'components/SEO';
import { TopNavBarProps } from 'components/TopNavBar';
import { TopTracks } from 'components/TopTracks';
import { cacheFor } from 'lib/apollo';
import { protectPage } from 'lib/protectPage';
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
      <SEO
        title="Soundchain - Top 100 Tracks"
        description="Check out Soundchain Top 100 tracks"
        canonicalUrl="/top-tracks/"
      />
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
