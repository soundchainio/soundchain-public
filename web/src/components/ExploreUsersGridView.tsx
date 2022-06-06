/* eslint-disable react/display-name */
import { PageInput, useExploreUsersQuery } from 'lib/graphql';
import React from 'react';
import { NoResultFound } from './NoResultFound';
import { ProfileListItemSkeleton } from './ProfileListItemSkeleton';
import { ExploreUsersProps } from './ExploreUsersListView';
import { ProfileGridItem } from './ProfileGridItem';
import { GridSkeleton } from './GridSkeleton';
import PullToRefresh from 'react-simple-pull-to-refresh';
import { InfiniteLoader as InfiniteLoaderLegacy } from './InfiniteLoader';

const pageSize = 15;

export const ExploreUsersGridView = ({ searchTerm }: ExploreUsersProps) => {
  const firstPage: PageInput = { first: pageSize };

  const { data, loading, fetchMore, refetch } = useExploreUsersQuery({
    variables: { search: searchTerm, page: firstPage },
  });

  if (!data || loading)
    return (
      <>
        <ProfileListItemSkeleton />
        <ProfileListItemSkeleton />
        <ProfileListItemSkeleton />
      </>
    );

  const loadMore = () => {
    fetchMore({
      variables: {
        search: searchTerm,
        page: {
          first: pageSize,
          after: pageInfo.endCursor,
          inclusive: false,
        },
      },
    });
  };

  const { nodes: profiles, pageInfo } = data?.exploreUsers;

  const loadMoreItems = loading ? () => null : loadMore;

  return (
    <div className='bg-gray-10 px-1 md:p-4 h-[calc(100%-96px)]'>
      {loading ? (
        <div className='grid grid-cols-2 justify-center gap-2 p-4 sm:grid-cols-3 lg:grid-cols-4'>
          <GridSkeleton />
          <GridSkeleton />
          <GridSkeleton />
          <GridSkeleton />
        </div>
      ) : !profiles ? (
        <NoResultFound type='items' />
      ) : (
        <PullToRefresh onRefresh={refetch} className='h-auto'>
          <div className='grid grid-cols-10 xl:grid-cols-8 2xl:grid-cols-10 gap-3 mx-auto my-4 px-2'>
            {profiles.map(profile => (
              <ProfileGridItem key={profile.id} profile={profile} />
            ))}
          </div>
        </PullToRefresh>
      )}
      <div className='flex justify-center'>
        {pageInfo.hasNextPage && <InfiniteLoaderLegacy loadMore={loadMoreItems} loadingMessage='Loading Users' />}
      </div>
    </div>
  );
};