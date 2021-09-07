import { Button } from 'components/Button';
import { BackButton } from 'components/Buttons/BackButton';
import { GenreSelector } from 'components/GenreSelector';
import { Layout } from 'components/Layout';
import { TopNavBarProps } from 'components/TopNavBar';
import { useMe } from 'hooks/useMe';
import { Genre, useUpdateFavoriteGenresMutation } from 'lib/graphql';
import Head from 'next/head';
import { useRouter } from 'next/router';
import React, { useEffect, useState } from 'react';

const topNavBarProps: TopNavBarProps = {
  leftButton: BackButton,
};

export default function SettingsNamePage() {
  const me = useMe();
  const router = useRouter();
  const [favoriteGenres, setFavoriteGenres] = useState<Genre[] | undefined>();
  const [updateFavoriteGenres, { loading }] = useUpdateFavoriteGenresMutation();

  useEffect(() => {
    setFavoriteGenres(me?.profile.favoriteGenres as Genre[])
  }, [me?.profile.favoriteGenres])

  const onSubmit = async () => {
    if (!favoriteGenres) return
    await updateFavoriteGenres({ variables: { input: { favoriteGenres } } });
    router.push('/settings');
  };

  if (!favoriteGenres) return null;

  return (
    <Layout topNavBarProps={topNavBarProps}>
      <Head>
        <title>Soundchain - Name Settings</title>
        <meta name="description" content="Name Settings" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="min-h-screen flex flex-col px-6 lg:px-8 bg-gray-20 py-6">
        <div className="flex flex-1 flex-col space-y-6">
          <GenreSelector initialValue={me?.profile.favoriteGenres as Genre[]} onSelect={setFavoriteGenres} />
          <div className="flex flex-col">
            <Button type="submit" onClick={onSubmit}>{loading ? 'Saving...' : 'Save'}</Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
