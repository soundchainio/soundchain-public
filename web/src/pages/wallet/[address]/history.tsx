import { BackButton } from 'components/Buttons/BackButton';
import { ConnectedNetwork } from 'components/ConnectedNetwork';
import { CopyWalletAddress } from 'components/CopyWalletAddress';
import { InfiniteLoader } from 'components/InfiniteLoader';
import { Layout } from 'components/Layout';
import { TopNavBarProps } from 'components/TopNavBar';
import { TrackListItemSkeleton } from 'components/TrackListItemSkeleton';
import { Transaction } from 'components/Transaction';
import { cacheFor } from 'lib/apollo';
import { useMaticUsdQuery, usePolygonscanQuery, UserByWalletDocument } from 'lib/graphql';
import { protectPage } from 'lib/protectPage';
import Head from 'next/head';
import { ParsedUrlQuery } from 'querystring';
import React from 'react';

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
  const { data: maticUsd } = useMaticUsdQuery();

  const pageSize = 50;
  const { data, fetchMore } = usePolygonscanQuery({
    variables: {
      wallet: address,
      page: { first: pageSize },
    },
  });

  if (!data) {
    return (
      <div className="space-y-2">
        <TrackListItemSkeleton />
        <TrackListItemSkeleton />
        <TrackListItemSkeleton />
      </div>
    );
  }

  const { result, nextPage } = data.getTransactionHistory;

  const loadMore = () => {
    fetchMore({
      variables: {
        page: {
          first: pageSize,
          after: nextPage,
        },
      },
    });
  };

  return (
    <Layout topNavBarProps={topNavBarProps}>
      <Head>
        <title>Soundchain - Wallet</title>
        <meta name="description" content="Wallet" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="flex flex-col gap-4 justify-center items-center p-4">
        <ConnectedNetwork />
        <CopyWalletAddress walletAddress={address} />
      </div>
      <ol className="flex flex-col text-white">
        {result.map((item, idx) => {
          return (
            <li key={item.hash} className={idx % 2 ? 'bg-gray-15' : 'bg-gray-20'}>
              <Transaction transaction={item} maticUsdValue={maticUsd?.maticUsd} />
            </li>
          );
        })}
        {nextPage && <InfiniteLoader loadMore={loadMore} loadingMessage="Loading history" />}
      </ol>
    </Layout>
  );
}
