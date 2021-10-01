import { TrackSkeleton } from 'components/TrackSkeleton';
import { useTrackQuery } from 'lib/graphql';
import React from 'react';
import { AudioPlayer } from './AudioPlayer';

interface TrackProps {
  trackId: string;
}

export const Track = ({ trackId }: TrackProps) => {
  const { data } = useTrackQuery({ variables: { id: trackId } });
  const track = data?.track;

  if (!track) return <TrackSkeleton />;

  return (
    <div className="p-4 bg-gray-20 break-words">
      <AudioPlayer id={track.id} src={track.playbackUrl} title={track.title} />
    </div>
  );
};
