import { InboxButton } from 'components/Buttons/InboxButton';
import { CopyLink } from 'components/CopyLink';
import { Layout } from 'components/Layout';
import { FormValues, RequestVerificationForm } from 'components/RequestVerificationForm';
import { TopNavBarProps } from 'components/TopNavBar';
import { useMe } from 'hooks/useMe';
import { Verified } from 'icons/Verified';
import { cacheFor } from 'lib/apollo';
import { useCreateProfileVerificationRequestMutation } from 'lib/graphql';
import { protectPage } from 'lib/protectPage';
import Head from 'next/head';
import { useEffect, useState } from 'react';

export const getServerSideProps = protectPage((context, apolloClient) => {
  return cacheFor(GetVerified, {}, context, apolloClient);
});


export default function GetVerified() {
  const [createRequestVerification] = useCreateProfileVerificationRequestMutation();
  const me = useMe();
  const [myProfileLink, setMyProfileLink] = useState('');

  const handleSubmit = (values: FormValues) => {
    createRequestVerification({ variables: { input: values } });
  };

  const topNavBarProps: TopNavBarProps = {
    rightButton: <InboxButton />,
    title: 'Get Verified'
  };

  useEffect(() => {
    setMyProfileLink(`${window.location.origin}/profiles/${me?.profile.id}`);
  }, [])

  return (
    <Layout topNavBarProps={topNavBarProps}>
      <Head>
        <title>Soundchain / Get Verified</title>
        <meta name="description" content="Get Verified" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="text-white font-bold text-center w-full px-4 py-10 flex items-center justify-center">
        Receive a blue checkmark <Verified className="ml-4 scale-150" />
      </div>
      <div className="text-gray-400 text-sm px-4 pb-10 text-center">
        In order to get verified on the SoundChain platform, please submit at least one of the following:
      </div>
      <ol className="text-gray-300 text-sm space-y-4">
        <li className="font-bold text-white px-4">
          1. Copy your SoundChain profile link:
        </li>
        <CopyLink link={myProfileLink} />
        <li className="font-bold text-white px-4">
          2. Add your SoundChain link to the socials on at least one of the following platforms:
          <RequestVerificationForm handleSubmit={handleSubmit} />
        </li>
      </ol>
    </Layout>
  );
}
