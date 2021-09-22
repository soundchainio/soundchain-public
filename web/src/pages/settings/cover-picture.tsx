import { BackButton } from 'components/Buttons/BackButton';
import { CoverPictureForm } from 'components/forms/profile/CoverPictureForm';
import { Layout } from 'components/Layout';
import { TopNavBarProps } from 'components/TopNavBar';
import Head from 'next/head';
import { useRouter } from 'next/router';
import React from 'react';
import { FormAction } from 'types/FormAction';

const topNavBarProps: TopNavBarProps = {
  title: 'Cover Picture',
  leftButton: <BackButton />,
};

export default function EditCoverPicturePage() {
  const router = useRouter();

  return (
    <Layout topNavBarProps={topNavBarProps} hideBottomNavBar>
      <Head>
        <title>Soundchain - Cover Picture</title>
        <meta name="description" content="Cover Picture" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="min-h-full flex flex-col px-6 lg:px-8 bg-gray-20 py-6">
        <CoverPictureForm action={FormAction.EDIT} afterSubmit={() => router.push('/settings')} />
      </div>
    </Layout>
  );
}
