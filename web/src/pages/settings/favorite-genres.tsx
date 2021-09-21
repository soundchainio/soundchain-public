import { Badge } from 'components/Badge';
import { Button } from 'components/Button';
import { BackButton } from 'components/Buttons/BackButton';
import { GenreSelector } from 'components/GenreSelector';
import { Layout } from 'components/Layout';
import { StepProgressBar } from 'components/StepProgressBar';
import { TopNavBarProps } from 'components/TopNavBar';
import { useMe } from 'hooks/useMe';
import { Genre, useUpdateFavoriteGenresMutation } from 'lib/graphql';
import Head from 'next/head';
import { useRouter } from 'next/router';
import React, { useEffect, useState } from 'react';

export default function EditFavoriteGenresPage() {
  const me = useMe();
  const router = useRouter();
  const [favoriteGenres, setFavoriteGenres] = useState<Genre[] | undefined>();
  const [updateFavoriteGenres, { loading }] = useUpdateFavoriteGenresMutation();
  const newAccount = Boolean(router.query.newAccount);

  useEffect(() => {
    setFavoriteGenres(me?.profile.favoriteGenres as Genre[]);
  }, [me?.profile.favoriteGenres]);

  const onSubmit = async () => {
    if (!favoriteGenres) return;
    await updateFavoriteGenres({ variables: { input: { favoriteGenres } } });
    if (newAccount) {
      router.push('/');
    } else {
      router.back();
    }
  };

  const onClose = () => {
    router.push('/');
  };

  if (!favoriteGenres) return null;

  const topNavBarProps: TopNavBarProps = {
    title: 'Favorite Genres',
    leftButton: <BackButton />,
    rightButton: newAccount ? <Badge label="Skip" onClick={onClose} selected={false} /> : undefined,
    subtitle: newAccount ? <StepProgressBar steps={3} actualStep={3} /> : undefined,
  };

  return (
    <Layout topNavBarProps={topNavBarProps} hideBottomNavBar>
      <Head>
        <title>Soundchain - Favorite Genres</title>
        <meta name="description" content="Favorite Genres" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="min-h-full flex flex-col px-6 lg:px-8 bg-gray-20 py-6">
        <div className="flex flex-1 flex-col space-y-6">
          <div className="flex-grow flex">
            <GenreSelector initialValue={me?.profile.favoriteGenres as Genre[]} onSelect={setFavoriteGenres} />
          </div>
          <div className="flex flex-col">
            <Button
              type="submit"
              loading={loading ? true : undefined}
              disabled={loading}
              variant="outline"
              borderColor={newAccount ? 'bg-blue-gradient' : 'bg-green-gradient'}
              className="h-12 mt-4"
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
