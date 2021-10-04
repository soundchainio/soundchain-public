import { TrackSkeleton } from 'components/TrackSkeleton';
import { useTrackQuery } from 'lib/graphql';
import React from 'react';
import { AudioPlayer } from './AudioPlayer';

interface TrackProps {
  trackId: string;
  coverPhotoUrl?: string;
}

export const Track = ({ trackId, coverPhotoUrl }: TrackProps) => {
  const { data } = useTrackQuery({ variables: { id: trackId } });
  const track = data?.track;

  if (!track) return <TrackSkeleton />;

  return (
    <AudioPlayer
      title={track.title || ''}
      src={track.playbackUrl}
      art={track.artworkUrl || coverPhotoUrl || undefined}
    />
  );
};
