import { TrackSkeleton } from 'components/TrackSkeleton';
import { useAudioPlayerContext } from 'hooks/useAudioPlayer';
import { useTrackLazyQuery } from 'lib/graphql';
import React, { useEffect } from 'react';
import { AudioPlayer } from './AudioPlayer';

interface TrackProps {
  trackId: string;
  coverPhotoUrl?: string;
}

export const Track = ({ trackId, coverPhotoUrl }: TrackProps) => {
  const [track, { data, error }] = useTrackLazyQuery({ variables: { id: trackId } });
  const { play } = useAudioPlayerContext();

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

  const song = {
    src: data.track.playbackUrl,
    trackId: data.track.id,
    art: data.track.artworkUrl || coverPhotoUrl || undefined,
    title: data.track.title,
  };

  return (
    <>
    <button type="button" className="bg-white" onClick={() => play(song)}>
      Play
    </button>
    <AudioPlayer
      trackId={data.track.id}
      title={data.track.title}
      src={data.track.playbackUrl}
      art={data.track.artworkUrl || coverPhotoUrl || undefined}
    />
    </>
  );
};
