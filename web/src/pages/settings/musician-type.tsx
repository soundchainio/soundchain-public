import { Button } from 'components/Button';
import { BackButton } from 'components/Buttons/BackButton';
import { MusicianTypeSelector } from 'components/MusicianTypeSelector';
import { Layout } from 'components/Layout';
import { TopNavBarProps } from 'components/TopNavBar';
import { useMe } from 'hooks/useMe';
import { MusicianType, useUpdateMusicianTypeMutation } from 'lib/graphql';
import Head from 'next/head';
import { useRouter } from 'next/router';
import React, { useEffect, useState } from 'react';

const topNavBarProps: TopNavBarProps = {
  leftButton: <BackButton />,
  title: "Musician Type"
};

export default function SettingsMusicianTypePage() {
  const me = useMe();
  const router = useRouter();
  const [musicianType, setMusicianType] = useState<MusicianType[] | undefined>();
  const [updateMusicianType, { loading }] = useUpdateMusicianTypeMutation();

  useEffect(() => {
    setMusicianType(me?.profile.musicianType as MusicianType[])
  }, [me?.profile.musicianType])

  const onSubmit = async () => {
    if (!musicianType) return
    await updateMusicianType({ variables: { input: { musicianTypes: musicianType } } });
    router.push('/settings');
  };

  if (!musicianType) return null;

  return (
    <Layout topNavBarProps={topNavBarProps}>
      <Head>
        <title>Soundchain - Name Settings</title>
        <meta name="description" content="Name Settings" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="min-h-screen flex flex-col px-6 lg:px-8 bg-gray-20 py-6">
        <div className="flex flex-1 flex-col space-y-6">
          <MusicianTypeSelector initialValue={me?.profile.musicianType as MusicianType[]} onSelect={setMusicianType} />
          <div className="flex flex-col">
            <Button type="submit" onClick={onSubmit}>{loading ? 'Saving...' : 'Save'}</Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
