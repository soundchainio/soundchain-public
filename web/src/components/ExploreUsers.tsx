import { ProfileListItem } from 'components/ProfileListItem';
import { useExploreQuery } from 'lib/graphql';
import React from 'react';

interface ExplorePageProps {
  searchTerm?: string;
}

export const ExploreUsers = ({ searchTerm }: ExplorePageProps) => {
  const { data, loading } = useExploreQuery({ variables: { search: searchTerm } });
  const profiles = data?.explore.profiles;

  if (loading) return <div> loading... </div>;

  return (
    <div>
      {profiles?.map(profile => (
        <div key={profile.id} className="text-white">
          <ProfileListItem profileId={profile.id} />
        </div>
      ))}
    </div>
  );
};
