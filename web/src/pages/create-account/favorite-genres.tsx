import { Badge } from 'components/Badge';
import { BackButton } from 'components/Buttons/BackButton';
import { FavoriteGenresForm } from 'components/forms/profile/FavoriteGenresForm';
import { Layout } from 'components/Layout';
import SEO from 'components/SEO';
import { StepProgressBar } from 'components/StepProgressBar';
import { TopNavBarProps } from 'components/TopNavBar';
import Head from 'next/head';
import { useRouter } from 'next/router';
import React from 'react';

export default function FavoriteGenresPage() {
  const router = useRouter();

  const topNavBarProps: TopNavBarProps = {
    title: 'Favorite Genres',
    leftButton: <BackButton />,
    rightButton: <Badge label="Skip" onClick={() => router.push('/create-account/musician-type')} selected={false} />,
    subtitle: <StepProgressBar steps={7} currentStep={3} />,
  };

  return (
    <>
      <SEO
        title="Soundchain - Favorite Genres"
        canonicalUrl="/create-account/favorite-genres"
        description="Soundchain Favorite Genres"
      />
      <Layout topNavBarProps={topNavBarProps} hideBottomNavBar>
        <Head>
          <title>Soundchain - Favorite Genres</title>
          <meta name="description" content="Favorite Genres" />
          <link rel="icon" href="/favicons/favicon.ico" />
        </Head>
        <div className="min-h-full flex flex-col px-6 lg:px-8 bg-gray-20 py-6">
          <div className="flex flex-1 flex-col space-y-6">
            <FavoriteGenresForm
              afterSubmit={() => router.push('/create-account/musician-type')}
              submitText="NEXT"
              submitProps={{ borderColor: 'bg-blue-gradient' }}
            />
          </div>
        </div>
      </Layout>
    </>
  );
}
