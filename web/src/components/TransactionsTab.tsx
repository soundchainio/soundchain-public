import { InfiniteLoader } from 'components/InfiniteLoader'
import { Transaction } from 'components/Transaction'
import { TransactionItemSkeleton } from 'components/TransactionItemSkeleton'
import { useMaticUsdQuery, usePolygonscanQuery } from 'lib/graphql'
import React from 'react'
import { EmptyTransactionList } from './EmptyTransactionList'
import { NoResultFound } from './NoResultFound'

interface TransactionsTabProps {
  address: string
}

export const TransactionsTab = ({ address }: TransactionsTabProps) => {
  const { data: maticUsd } = useMaticUsdQuery()

  const pageSize = 50
  const { data, loading, fetchMore } = usePolygonscanQuery({
    variables: {
      wallet: address,
      page: { first: pageSize },
    },
  })

  if (loading) {
    return (
      <div className="space-y-2">
        <TransactionItemSkeleton />
        <TransactionItemSkeleton />
        <TransactionItemSkeleton />
      </div>
    )
  }

  if (!data) {
    return <NoResultFound type="transactions" />
  }

  const { result, nextPage } = data.getTransactionHistory

  if (!result.length) {
    return <EmptyTransactionList />
  }

  const loadMore = () => {
    fetchMore({
      variables: {
        page: {
          first: pageSize,
          after: nextPage,
        },
      },
    })
  }

  return (
    <ol className="flex flex-col text-white">
      {result.map(item => {
        return (
          <li key={item.hash} className="odd:bg-gray-15 even:bg-gray-20">
            <Transaction transaction={item} maticUsdValue={maticUsd?.maticUsd} />
          </li>
        )
      })}
      {nextPage && <InfiniteLoader loadMore={loadMore} loadingMessage="Loading history" />}
    </ol>
  )
}
