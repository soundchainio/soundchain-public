import { ProfileListItem } from 'components/ProfileListItem';
import { PageInput, useExploreUsersQuery } from 'lib/graphql';
import React from 'react';
import { InfiniteLoader } from './InfiniteLoader';

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
      }
    });
  };

  const { nodes: profiles, pageInfo } = data?.exploreUsers;

  return (
    <div>
      {profiles?.map(profile => (
        <div key={profile.id} className="text-white">
          <ProfileListItem profileId={profile.id} />
        </div>
      ))}
      {pageInfo.hasNextPage && <InfiniteLoader loadMore={loadNext} loadingMessage="Loading Users" />}
    </div>
  );
};
