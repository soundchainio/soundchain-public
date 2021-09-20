import { Badge } from 'components/Badge';
import { Layout } from 'components/Layout';
import { ProfilePictureForm } from 'components/ProfilePictureForm';
import { StepProgressBar } from 'components/StepProgressBar';
import { TopNavBarProps } from 'components/TopNavBar';
import Head from 'next/head';
import { useRouter } from 'next/router';
import React from 'react';
import { FormAction } from 'types/FormAction';

export default function ProfilePicturePage() {
  const router = useRouter();

  const onClose = () => {
    router.push('/');
  };

  const topNavBarProps: TopNavBarProps = {
    title: 'Profile Picture',
    leftButton: (
      <div className="text-gray-400 font-bold flex-1 text-left" onClick={onClose}>
        Cancel
      </div>
    ),
    rightButton: <Badge label="Skip" onClick={onClose} selected={false} />,
    subtitle: <StepProgressBar steps={3} actualStep={1} />,
  };

  return (
    <Layout topNavBarProps={topNavBarProps} hideBottomNavBar>
      <Head>
        <title>Soundchain - Name Settings</title>
        <meta name="description" content="Name Settings" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="min-h-full flex flex-col px-6 lg:px-8 bg-gray-20 py-6">
        <ProfilePictureForm action={FormAction.NEW} />
      </div>
    </Layout>
  );
}
