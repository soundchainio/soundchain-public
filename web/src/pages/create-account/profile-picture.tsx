import { Badge } from 'components/Badge';
import { ProfilePictureForm } from 'components/forms/profile/ProfilePictureForm';
import { Layout } from 'components/Layout';
import { StepProgressBar } from 'components/StepProgressBar';
import { TopNavBarProps } from 'components/TopNavBar';
import Head from 'next/head';
import { useRouter } from 'next/router';
import React from 'react';

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
    subtitle: <StepProgressBar steps={6} currentStep={1} />,
  };

  return (
    <Layout topNavBarProps={topNavBarProps} hideBottomNavBar>
      <Head>
        <title>Soundchain - Profile Picture</title>
        <meta name="description" content="Profile Picture" />
        <link rel="icon" href="/favicons/favicon.ico" />
      </Head>
      <div className="min-h-full flex flex-col px-6 lg:px-8 bg-gray-20 py-6">
        <ProfilePictureForm
          afterSubmit={() => router.push('/create-account/cover-picture')}
          submitText="NEXT"
          submitProps={{ borderColor: 'bg-blue-gradient' }}
        />
      </div>
    </Layout>
  );
}
