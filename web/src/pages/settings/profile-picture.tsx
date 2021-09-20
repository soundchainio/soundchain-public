import { BackButton } from 'components/Buttons/BackButton';
import { Layout } from 'components/Layout';
import { ProfilePictureForm } from 'components/ProfilePictureForm';
import { TopNavBarProps } from 'components/TopNavBar';
import Head from 'next/head';
import React from 'react';
import { FormAction } from 'types/FormAction';

export default function ProfilePicturePage() {
  const topNavBarProps: TopNavBarProps = {
    title: 'Profile Picture',
    leftButton: <BackButton />,
  };

  return (
    <Layout topNavBarProps={topNavBarProps} hideBottomNavBar>
      <Head>
        <title>Soundchain - Profile Picture</title>
        <meta name="description" content="Profile Picture" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="min-h-full flex flex-col px-6 lg:px-8 bg-gray-20 py-6">
        <ProfilePictureForm action={FormAction.EDIT} />
      </div>
    </Layout>
  );
}
