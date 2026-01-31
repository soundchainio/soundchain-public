import React from 'react'

import classNames from 'classnames'
import { Timestamp } from 'components/Timestamp'
import { DeletedPostNotification } from 'lib/graphql'

import { MiniAudioPlayer } from './MiniAudioPlayer'
import { PostBodyWithEmotes } from './EmoteRenderer'

interface DeletedPostNotificationProps {
  notification: DeletedPostNotification
  index: number
}

export const DeletedPostNotificationItem = ({
  notification: { track, createdAt, previewBody },
  index,
}: DeletedPostNotificationProps) => {
  return (
    <div className={classNames('flex flex-col rounded-lg p-4', index % 2 === 0 ? 'bg-gray-25' : 'bg-gray-20')}>
      <div className="flex break-words">
        <div>
          <div className="inline-block w-full items-center text-sm text-gray-100">
            <span className="flex flex-wrap">The following post was removed by an admin from our platform</span>
          </div>
          <Timestamp small datetime={createdAt} className="text-sm" />
        </div>
      </div>
      <div className="mt-4 flex">
        <div className="w-full break-words rounded-xl bg-gray-30 p-4 text-sm text-gray-100">
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
            <PostBodyWithEmotes body={previewBody || ''} linkify />
          )}
        </div>
      </div>
    </div>
  )
}
