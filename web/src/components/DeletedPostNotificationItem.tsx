import classNames from 'classnames';
import { DeletedPostNotification } from 'lib/graphql';
import React from 'react';
import { MiniAudioPlayer } from './MiniAudioPlayer';
import { Timestamp } from './Timestamp';

interface DeletedPostNotificationProps {
  notification: DeletedPostNotification;
  index: number;
}

export const DeletedPostNotificationItem = ({
  notification: { track, createdAt, previewBody },
  index,
}: DeletedPostNotificationProps) => {
  return (
    <div className={classNames('flex flex-col p-4', index % 2 === 0 ? 'bg-gray-25' : 'bg-gray-20')}>
      <div className="break-words flex">
        <div>
          <div className="text-gray-100 text-sm items-center w-full inline-block">
            <span className="flex flex-wrap">The following post was removed by an admin from our platform</span>
          </div>
          <Timestamp small datetime={createdAt} className="text-sm" />
        </div>
      </div>
      <div className="flex mt-4">
        <div className="p-4 bg-gray-30 w-full break-words text-gray-100 rounded-xl text-sm">
          {track ? (
            <MiniAudioPlayer
              song={{
                src: track.playbackUrl,
                trackId: track.id,
                art: track.artworkUrl,
                title: track.title,
                artist: track.artist,
                isFavorite: track.isFavorite,
                playbackCount: track.playbackCountFormatted,
                favoriteCount: track.favoriteCount,
                saleType: track.saleType,
                price: track.price,
              }}
            />
          ) : (
            previewBody
          )}
        </div>
      </div>
    </div>
  );
};
