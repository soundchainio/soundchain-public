import { BackButton } from 'components/Buttons/BackButton';
import { ConnectedNetwork } from 'components/ConnectedNetwork';
import { CopyWalletAddress } from 'components/CopyWalletAddress';
import { HistoryTabs } from 'components/HistoryTabs';
import { InternalTransactionsTab } from 'components/InternalTransactionsTab';
import { Layout } from 'components/Layout';
import { TopNavBarProps } from 'components/TopNavBar';
import { TransactionsTab } from 'components/TransactionsTab';
import { cacheFor } from 'lib/apollo';
import { UserByWalletDocument } from 'lib/graphql';
import { protectPage } from 'lib/protectPage';
import { ParsedUrlQuery } from 'querystring';
import React, { useState } from 'react';
import { HistoryTab } from 'types/HistoryTabType';
import SEO from '../../../components/SEO';

export interface HistoryPageProps {
  address: string;
}

interface HistoryPageParams extends ParsedUrlQuery {
  address: string;
}

export const getServerSideProps = protectPage<HistoryPageProps, HistoryPageParams>(async (context, apolloClient) => {
  const address = context.params?.address;

  if (!address) {
    return { notFound: true };
  }

  const { data } = await apolloClient.query({
    query: UserByWalletDocument,
    variables: { walletAddress: address },
    context,
  });

  if (!data.getUserByWallet) {
    return { notFound: true };
  }

  return cacheFor(HistoryPage, { address }, context, apolloClient);
});

const topNavBarProps: TopNavBarProps = {
  leftButton: <BackButton />,
  title: 'History',
};

export default function HistoryPage({ address }: HistoryPageProps) {
  const [selectedTab, setSelectedTab] = useState<HistoryTab>(HistoryTab.TRANSACTIONS);

  return (
    <>
      <SEO
        title="Wallet History | SoundChain"
        description="SoundChain Wallet History"
        canonicalUrl={`/wallet/${address}/history/`}
      />
      <Layout topNavBarProps={topNavBarProps}>
        <div className="flex flex-col gap-4 justify-center items-center p-4">
          <ConnectedNetwork />
          <CopyWalletAddress walletAddress={address} />
        </div>
        <HistoryTabs selectedTab={selectedTab} setSelectedTab={setSelectedTab} />
        {selectedTab === HistoryTab.TRANSACTIONS && <TransactionsTab address={address} />}
        {selectedTab === HistoryTab.INTERNAL && <InternalTransactionsTab address={address} />}
      </Layout>
    </>
  );
}
