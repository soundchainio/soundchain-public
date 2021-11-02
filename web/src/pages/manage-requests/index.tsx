import { Layout } from 'components/Layout';
import { ManageRequestTabs } from 'components/ManageRequestsTabs';
import { RequestsList } from 'components/RequestsList';
import { TopNavBarProps } from 'components/TopNavBar';
import { cacheFor } from 'lib/apollo';
import { protectPage } from 'lib/protectPage';
import Head from 'next/head';
import { useState } from 'react';
import { ManageRequestTab } from 'types/ManageRequestTabType';

export const getServerSideProps = protectPage((context, apolloClient) => {
  return cacheFor(ManageRequests, {}, context, apolloClient);
});

export default function ManageRequests() {
  const [selectedTab, setSelectedTab] = useState<ManageRequestTab>(ManageRequestTab.PENDING);

  const topNavBarProps: TopNavBarProps = {
    title: 'Admin Panel'
  };

  return (
    <Layout topNavBarProps={topNavBarProps}>
      <Head>
        <title>Soundchain / Get Verified</title>
        <meta name="description" content="Get Verified" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="pt-2 bg-black">
        <ManageRequestTabs selectedTab={selectedTab} setSelectedTab={setSelectedTab} />
        <RequestsList status={selectedTab} />
      </div>
    </Layout>
  );
}
