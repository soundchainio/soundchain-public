import { NotAvailableMessage } from 'components/NotAvailableMessage';
import { TrackQuery, Track as TheTrack } from 'lib/graphql';
import React from 'react';
import { MiniAudioPlayer } from './MiniAudioPlayer';

interface TrackProps {
  track: TrackQuery['track'] | TheTrack;
  coverPhotoUrl?: string;
  hideBadgeAndPrice?: boolean;
}

export const Track = (props: TrackProps) => {
  const { track, coverPhotoUrl, hideBadgeAndPrice } = props;

  if (track.deleted) {
    return <NotAvailableMessage type="track" />;
  }

  return (
    <MiniAudioPlayer
      hideBadgeAndPrice={hideBadgeAndPrice}
      song={{
        src: track.playbackUrl,
        trackId: track.id,
        art: track.artworkUrl || coverPhotoUrl || undefined,
        title: track.title,
        artist: track.artist,
        isFavorite: track.isFavorite,
        playbackCount: track.playbackCountFormatted,
        favoriteCount: track.favoriteCount,
        saleType: track.saleType,
        price: track.price,
        editionSize: track.editionSize,
        listingCount: track.listingCount,
      }}
    />
  );
};
