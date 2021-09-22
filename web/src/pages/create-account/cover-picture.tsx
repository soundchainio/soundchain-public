import { Badge } from 'components/Badge';
import { BackButton } from 'components/Buttons/BackButton';
import { CoverPictureForm } from 'components/forms/profile/CoverPictureForm';
import { Layout } from 'components/Layout';
import { StepProgressBar } from 'components/StepProgressBar';
import { TopNavBarProps } from 'components/TopNavBar';
import Head from 'next/head';
import { useRouter } from 'next/router';
import React from 'react';

export default function CoverPicturePage() {
  const router = useRouter();

  const onClose = () => {
    router.push('/');
  };

  const topNavBarProps: TopNavBarProps = {
    title: 'Cover Photo',
    leftButton: <BackButton />,
    rightButton: <Badge label="Skip" onClick={onClose} selected={false} />,
    subtitle: <StepProgressBar steps={5} currentStep={2} />,
  };

  return (
    <Layout topNavBarProps={topNavBarProps} hideBottomNavBar>
      <Head>
        <title>Soundchain - Cover Picture</title>
        <meta name="description" content="Cover Picture" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="min-h-full flex flex-col px-6 lg:px-8 bg-gray-20 py-6">
        <CoverPictureForm
          afterSubmit={() => router.push('/')}
          submitText="NEXT"
          submitProps={{ borderColor: 'bg-blue-gradient' }}
        />
      </div>
    </Layout>
  );
}
