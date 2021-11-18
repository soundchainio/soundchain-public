import { NotAvailableMessage } from 'components/NotAvailableMessage';
import { TrackSkeleton } from 'components/TrackSkeleton';
import { useTrackLazyQuery } from 'lib/graphql';
import React, { useEffect } from 'react';
import { MiniAudioPlayer } from './MiniAudioPlayer';

interface TrackProps {
  trackId: string;
  coverPhotoUrl?: string;
}

export const Track = ({ trackId, coverPhotoUrl }: TrackProps) => {
  const [track, { data, error }] = useTrackLazyQuery({ variables: { id: trackId } });

  useEffect(() => {
    if (!data?.track) {
      track();
    }
  }, []);

  useEffect(() => {
    if (error) {
      setTimeout(() => {
        track();
      }, 2000);
    }
  }, [data, error]);

  if (!data?.track) return <TrackSkeleton />;

  if (data?.track.deleted) {
    return <NotAvailableMessage type="track" />;
  }

  return (
    <MiniAudioPlayer
      song={{
        src: data.track.playbackUrl,
        trackId: data.track.id,
        art: data.track.artworkUrl || coverPhotoUrl || undefined,
        title: data.track.title,
        artist: data.track.artist,
        isFavorite: data.track.isFavorite,
      }}
    />
  );
};
