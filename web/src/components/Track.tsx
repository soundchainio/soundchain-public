import { NotAvailableMessage } from 'components/NotAvailableMessage';
import { TrackQuery } from 'lib/graphql';
import React from 'react';
import { MiniAudioPlayer } from './MiniAudioPlayer';

interface TrackProps {
  track: TrackQuery['track'];
  coverPhotoUrl?: string;
}

export const Track = ({ track, coverPhotoUrl }: TrackProps) => {
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
