import { PageInput, ProfileVerificationStatusType, useProfileVerificationRequestsQuery } from 'lib/graphql'
import React from 'react'
import { InfiniteLoader } from 'components/InfiniteLoader'
import { ManageRequestCard } from './ManageRequestCard'
import { NoResultFound } from './NoResultFound'

interface RequestsListProps {
  status: ProfileVerificationStatusType
}

const pageSize = 15

export const RequestsList = ({ status }: RequestsListProps) => {
  const firstPage: PageInput = { first: pageSize }
  const { data, loading, fetchMore } = useProfileVerificationRequestsQuery({
    fetchPolicy: 'network-only',
    variables: { status, page: firstPage },
  })

  if (!data) return null

  if (loading) return <div>loading...</div>

  const loadNext = () => {
    fetchMore({
      variables: {
        status,
        page: {
          first: pageSize,
          after: pageInfo.endCursor,
          inclusive: false,
        },
      },
    })
  }

  const { nodes: requests, pageInfo } = data?.profileVerificationRequests

  return (
    <div>
      {requests.length > 0 ? (
        requests?.map(request => <ManageRequestCard key={request.profileId} request={request} />)
      ) : (
        <NoResultFound type="Verification Requests" />
      )}
      {pageInfo.hasNextPage && <InfiniteLoader loadMore={loadNext} loadingMessage="Loading Requests" />}
    </div>
  )
}
