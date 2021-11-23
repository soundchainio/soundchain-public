import { NotAvailableMessage } from 'components/NotAvailableMessage';
import { TrackSkeleton } from 'components/TrackSkeleton';
import { TrackQuery, useTrackLazyQuery } from 'lib/graphql';
import React, { useEffect, useState } from 'react';
import { MiniAudioPlayer } from './MiniAudioPlayer';

interface TrackProps {
  trackId: string;
  track?: TrackQuery['track'];
  coverPhotoUrl?: string;
}

export const Track = ({ trackId, track: initialValue, coverPhotoUrl }: TrackProps) => {
  const [track, setTrack] = useState<TrackQuery['track'] | undefined>(initialValue);
  const [trackQuery, { data }] = useTrackLazyQuery({ variables: { id: trackId } });

  useEffect(() => {
    if (!track) {
      trackQuery();
    }
  }, [track, trackQuery]);

  useEffect(() => {
    if (data) {
      setTrack(data.track);
    }
  }, [data]);

  if (!track) return <TrackSkeleton />;

  if (track.deleted) {
    return <NotAvailableMessage type="track" />;
  }

  return (
    <MiniAudioPlayer
      song={{
        src: track.playbackUrl,
        trackId: track.id,
        art: track.artworkUrl || coverPhotoUrl || undefined,
        title: track.title,
        artist: track.artist,
        isFavorite: track.isFavorite,
      }}
    />
  );
};
