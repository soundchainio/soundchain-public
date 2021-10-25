import { useExploreQuery } from 'lib/graphql';
import React from 'react';

interface ExplorePageProps {
  searchTerm?: string;
}

export const ExploreTracks = ({ searchTerm }: ExplorePageProps) => {
  const { data, loading } = useExploreQuery({ variables: { search: searchTerm } });
  const profiles = data?.explore.profiles;
  const tracks = data?.explore.tracks;

  if (loading) return <div> loading... </div>;

  return (
    <div>
      {tracks?.map(track => (
        <div key={track.id} className="text-white">
          hiiii track
        </div>
      ))}
    </div>
  );
};
