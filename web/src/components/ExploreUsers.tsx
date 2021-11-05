import { ProfileListItem } from 'components/ProfileListItem';
import { PageInput, useExploreUsersQuery } from 'lib/graphql';
import React from 'react';
import { InfiniteLoader } from './InfiniteLoader';
import { NoResultFound } from './NoResultFound';

interface ExplorePageProps {
  searchTerm?: string;
}

const pageSize = 15;

export const ExploreUsers = ({ searchTerm }: ExplorePageProps) => {
  const firstPage: PageInput = { first: pageSize };
  const { data, loading, fetchMore } = useExploreUsersQuery({
    variables: { search: searchTerm, page: firstPage },
  });

  if (!data) return null;

  if (loading) return <div>loading...</div>;

  const loadNext = () => {
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

  return (
    <div className="bg-gray-10 p-5 space-y-3">
      {profiles.length > 0 ? (
        profiles?.map(profile => (
          <div key={profile.id} className="text-white">
            <ProfileListItem profile={profile} />
          </div>
        ))
      ) : (
        <NoResultFound type="Users" />
      )}
      {pageInfo.hasNextPage && <InfiniteLoader loadMore={loadNext} loadingMessage="Loading Users" />}
    </div>
  );
};
