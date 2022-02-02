import { Layout } from 'components/Layout';
import { ManageRequestTabs } from 'components/ManageRequestsTabs';
import { RequestsList } from 'components/RequestsList';
import SEO from 'components/SEO';
import { TopNavBarProps } from 'components/TopNavBar';
import { cacheFor } from 'lib/apollo';
import { Role } from 'lib/graphql';
import { protectPage } from 'lib/protectPage';
import { useState } from 'react';
import { ManageRequestTab } from 'types/ManageRequestTabType';

export const getServerSideProps = protectPage(async (context, apolloClient) => {
  try {
    if (!context.user?.roles.includes(Role.Admin)) return { notFound: true };
    return await cacheFor(ManageRequests, {}, context, apolloClient);
  } catch (error) {
    return { notFound: true };
  }
});

export default function ManageRequests() {
  const [selectedTab, setSelectedTab] = useState<ManageRequestTab>(ManageRequestTab.PENDING);

  const topNavBarProps: TopNavBarProps = {
    title: 'Admin Panel',
  };

  return (
    <>
      <SEO title="Get Verified | Soundchain" canonicalUrl="/manage-requests/" description="Soundchain Get Verified" />
      <Layout topNavBarProps={topNavBarProps}>
        <div className="pt-2 bg-black">
          <ManageRequestTabs selectedTab={selectedTab} setSelectedTab={setSelectedTab} />
          <RequestsList status={selectedTab} />
        </div>
      </Layout>
    </>
  );
}
