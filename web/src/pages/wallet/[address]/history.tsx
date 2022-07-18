import { ConnectedNetwork } from 'components/ConnectedNetwork';
import { CopyWalletAddress } from 'components/CopyWalletAddress';
import { HistoryTabs } from 'components/HistoryTabs';
import { InternalTransactionsTab } from 'components/InternalTransactionsTab';
import { TopNavBarProps } from 'components/TopNavBar';
import { TransactionsTab } from 'components/TransactionsTab';
import { useLayoutContext } from 'hooks/useLayoutContext';
import { cacheFor } from 'lib/apollo';
import { protectPage } from 'lib/protectPage';
import { ParsedUrlQuery } from 'querystring';
import React, { useEffect, useState } from 'react';
import { HistoryTab } from 'types/HistoryTabType';
import SEO from '../../../components/SEO';
import { User } from 'lib/graphql';

export interface HistoryPageProps {
  address: string;
}

interface HistoryPageParams extends ParsedUrlQuery {
  address: string;
}

// eslint-disable-next-line require-await
export const getServerSideProps = protectPage<HistoryPageProps, HistoryPageParams>(async (context, apolloClient) => {
  const address = context.params?.address;
  const { magicWalletAddress, metaMaskWalletAddressees } = context.user as User;
  const wallets = [
    magicWalletAddress,
    ...(metaMaskWalletAddressees as string[]),
  ];

  if (!address || !wallets.includes(address)) {
    return { notFound: true };
  }

  return cacheFor(HistoryPage, { address }, context, apolloClient);
});

const topNavBarProps: TopNavBarProps = {

  title: 'History',
};

export default function HistoryPage({ address }: HistoryPageProps) {
  const [selectedTab, setSelectedTab] = useState<HistoryTab>(HistoryTab.TRANSACTIONS);
  const { setTopNavBarProps } = useLayoutContext();

  useEffect(() => {
    setTopNavBarProps(topNavBarProps);
  }, [setTopNavBarProps]);

  return (
    <>
      <SEO
        title="Wallet History | SoundChain"
        description="SoundChain Wallet History"
        canonicalUrl={`/wallet/${address}/history/`}
      />
      <div className="flex flex-col gap-4 justify-center items-center p-4">
        <ConnectedNetwork />
        <CopyWalletAddress walletAddress={address} />
      </div>
      <HistoryTabs selectedTab={selectedTab} setSelectedTab={setSelectedTab} />
      {selectedTab === HistoryTab.TRANSACTIONS && <TransactionsTab address={address} />}
      {selectedTab === HistoryTab.INTERNAL && <InternalTransactionsTab address={address} />}
    </>
  );
}
