import classNames from 'classnames'
import { NewPostNotification as NewPostIcon } from 'icons/NewPostNotification'
import { NewPostNotification } from 'lib/graphql'
import NextLink from 'next/link'
import React from 'react'
import { Avatar } from './Avatar'
import { MiniAudioPlayer } from './MiniAudioPlayer'
import { Timestamp } from './Timestamp'

interface NewPostNotificationProps {
  notification: NewPostNotification
  index: number
}

export const NewPostNotificationItem = ({
  notification: { link, track, createdAt, previewBody, authorName, authorPicture },
  index,
}: NewPostNotificationProps) => {
  return (
    <NextLink href={link}>
      <div className={classNames('flex cursor-pointer flex-col p-4', index % 2 === 0 ? 'bg-gray-25' : 'bg-gray-20')}>
        <div className="flex break-words">
          <div className="flex items-center pr-4">
            <Avatar profile={{ profilePicture: authorPicture }} linkToProfile={false} pixels={40} />
            <div className="relative">
              <NewPostIcon className="absolute -right-1" />
            </div>
          </div>
          <div>
            <div className="flex  text-sm text-gray-100">
              <div className="font-semibold">{authorName}</div>&nbsp;
              {track ? 'posted a new track:' : 'created a new post:'}
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
              previewBody
            )}
          </div>
        </div>
      </div>
    </NextLink>
  )
}
