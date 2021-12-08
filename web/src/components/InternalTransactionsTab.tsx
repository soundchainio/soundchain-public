import { InfiniteLoader } from 'components/InfiniteLoader';
import { TransactionItemSkeleton } from 'components/TransactionItemSkeleton';
import { useMaticUsdQuery, usePolygonscanInternalTrxQuery } from 'lib/graphql';
import React from 'react';
import { EmptyTransactionList } from './EmptyTransactionList';
import { InternalTransaction } from './InternalTransaction';

interface InternalTransactionsTabProps {
  address: string;
}

export const InternalTransactionsTab = ({ address }: InternalTransactionsTabProps) => {
  const { data: maticUsd } = useMaticUsdQuery();

  const pageSize = 50;
  const { data, fetchMore } = usePolygonscanInternalTrxQuery({
    variables: {
      wallet: address,
      page: { first: pageSize },
    },
  });

  if (!data) {
    return (
      <div className="space-y-2">
        <TransactionItemSkeleton />
        <TransactionItemSkeleton />
        <TransactionItemSkeleton />
      </div>
    );
  }

  const { result, nextPage } = data.getInternalTransactionHistory;

  if (!result.length) {
    return <EmptyTransactionList />;
  }

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
    <ol className="flex flex-col text-white">
      {result.map((item, idx) => {
        return (
          <li key={item.hash} className={idx % 2 ? 'bg-gray-15' : 'bg-gray-20'}>
            <InternalTransaction transaction={item} maticUsdValue={maticUsd?.maticUsd} />
          </li>
        );
      })}
      {nextPage && <InfiniteLoader loadMore={loadMore} loadingMessage="Loading history" />}
    </ol>
  );
};
