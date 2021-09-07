import { Layout } from 'components/Layout';
import { MusicianTypeSelector } from 'components/MusicianTypeSelector';
import { TopNavBarProps } from 'components/TopNavBar';
import Head from 'next/head';
import { useState } from 'react';
import { MusicianType } from 'lib/graphql';

export default function MusicianTypePage() {
  const [musicianType, setMusicianType] = useState<MusicianType[]>([]);

  const topNavBarProps: TopNavBarProps = {
    title: 'Notifications',
  };

  return (
    <Layout topNavBarProps={topNavBarProps}>
      <Head>
        <title>Soundchain / Settings / Musician Type</title>
        <meta name="description" content="Notifications" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <MusicianTypeSelector onSelect={setMusicianType} />
    </Layout>
  );
}
