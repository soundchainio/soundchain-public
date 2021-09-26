import { TrackSkeleton } from 'components/TrackSkeleton';
import { useTrackQuery } from 'lib/graphql';
import React from 'react';
import { Timestamp } from './Timestamp';

interface TrackProps {
  trackId: string;
}

export const Track = ({ trackId }: TrackProps) => {
  const { data } = useTrackQuery({ variables: { id: trackId } });
  const track = data?.track;

  if (!track) return <TrackSkeleton />;

  return (
    <div className="p-4 bg-gray-20 break-words">
      <div className="flex items-center">
        <div className="flex items-center w-full ml-4">

          <div className="flex flex-1 flex-col">
            <div>
              <a className="text-lg font-bold text-gray-100">{track.title}</a>
            </div>
            <Timestamp
              datetime={track.createdAt}
              edited={(track.createdAt !== track.updatedAt) || false}
              className="flex-1 text-left"
            />
          </div>
        </div>
      </div>
      {track.audioUrl && (
        <audio controls className="mt-4 w-full bg-gray-20">
          <source src={track.audioUrl} type="audio/ogg" />
          <source src={track.audioUrl} type="audio/mp3" />
          Your browser does not support the audio tag.
        </audio>
      )}
    </div>
  );
};
