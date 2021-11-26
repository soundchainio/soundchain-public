import { BackButton } from 'components/Buttons/BackButton';
import { InfiniteLoader } from 'components/InfiniteLoader';
import { Layout } from 'components/Layout';
import { TopNavBarProps } from 'components/TopNavBar';
import { TrackListItemSkeleton } from 'components/TrackListItemSkeleton';
import { Transaction } from 'components/Transaction';
import { Copy2 as Copy } from 'icons/Copy2';
import { Polygon } from 'icons/Polygon';
import { cacheFor } from 'lib/apollo';
import { useMaticUsdQuery, usePolygonscanQuery, UserByWalletDocument } from 'lib/graphql';
import { protectPage } from 'lib/protectPage';
import Head from 'next/head';
import { ParsedUrlQuery } from 'querystring';
import React from 'react';
import { toast } from 'react-toastify';

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

const topNovaBarProps: TopNavBarProps = {
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
    <Layout topNavBarProps={topNovaBarProps}>
      <Head>
        <title>Soundchain - Wallet</title>
        <meta name="description" content="Wallet" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="flex flex-col gap-4 justify-center items-center p-4">
        <div className="flex gap-2 items-center font-bold text-xs">
          <span className="ml-auto uppercase relative text-gray-80 before:bg-green-400 before:rounded-full before:h-1 before:w-1 before:inline-block before:absolute before:mt-[0.375rem] before:-ml-2">
            Network:
          </span>
          <Polygon />
          <span className="text-white mr-2">Polygon</span>
        </div>
        <div className="flex flex-row text-xxs bg-gray-1A w-full pl-2 pr-3 py-2 items-center justify-between border border-gray-50 rounded-sm">
          <div className="flex flex-row items-center w-10/12 justify-start">
            <Polygon />
            <span className="text-gray-80 md-text-sm font-bold mx-1 truncate w-full">{address} </span>
          </div>
          <button
            className="flex flex-row gap-1 items-center border-2 border-gray-30 border-opacity-75 rounded p-1"
            onClick={() => {
              navigator.clipboard.writeText({ address } + '');
              toast('Copied to clipboard');
            }}
            type="button"
          >
            <Copy />
            <span className="text-gray-80 uppercase leading-none">copy</span>
          </button>
        </div>
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
