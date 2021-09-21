import { Button } from 'components/Button';
import { BackButton } from 'components/Buttons/BackButton';
import { Layout } from 'components/Layout';
import { MusicianTypeSelector } from 'components/MusicianTypeSelector';
import { TopNavBarProps } from 'components/TopNavBar';
import { useMe } from 'hooks/useMe';
import { MusicianType, useUpdateMusicianTypeMutation } from 'lib/graphql';
import Head from 'next/head';
import { useRouter } from 'next/router';
import React, { useEffect, useState } from 'react';

const topNavBarProps: TopNavBarProps = {
  leftButton: <BackButton />,
  title: 'Musician Type',
};

export default function EditMusicianTypePage() {
  const me = useMe();
  const router = useRouter();
  const [musicianTypes, setMusicianType] = useState<MusicianType[] | undefined>();
  const [updateMusicianType, { loading }] = useUpdateMusicianTypeMutation();

  useEffect(() => {
    setMusicianType(me?.profile.musicianTypes as MusicianType[]);
  }, [me?.profile.musicianTypes]);

  const onSubmit = async () => {
    if (!musicianTypes) return;
    await updateMusicianType({ variables: { input: { musicianTypes: musicianTypes } } });
    router.push('/settings');
  };

  if (!musicianTypes) return null;

  return (
    <Layout topNavBarProps={topNavBarProps} hideBottomNavBar>
      <Head>
        <title>Soundchain - Musician Type</title>
        <meta name="description" content="Musician Type" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="min-h-full flex flex-col px-6 lg:px-8 bg-gray-20 py-6">
        <div className="flex flex-1 flex-col space-y-6">
          <MusicianTypeSelector initialValue={me?.profile.musicianTypes as MusicianType[]} onSelect={setMusicianType} />
          <div className="flex flex-col">
            <Button
              type="submit"
              loading={loading}
              disabled={loading}
              variant="outline"
              borderColor="bg-green-gradient"
              className="h-12"
              onClick={onSubmit}
            >
              SAVE
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
