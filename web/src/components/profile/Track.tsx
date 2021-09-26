import { TrackSkeleton } from 'components/TrackSkeleton';
import { useTrackQuery } from 'lib/graphql';
import React from 'react';

interface TrackProps {
  trackId: string;
}

export const Track = ({ trackId }: TrackProps) => {
  const { data } = useTrackQuery({ variables: { id: trackId } });
  const track = data?.track;

  if (!track) return <TrackSkeleton />;

  return (
    <div>
      track tal
    </div>
  );
};
