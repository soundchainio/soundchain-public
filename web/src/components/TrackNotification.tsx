import classNames from 'classnames'
import { Matic } from 'components/Matic'
import NextLink from 'next/link'
import React from 'react'
import Asset from './Asset'
import { Timestamp } from './Timestamp'

interface NotificationProps {
  artist: string
  artworkUrl: string
  createdAt: string
  index: number
  price: number
  title: JSX.Element | string
  trackId: string
  trackName: string
}

export const TrackNotification = ({
  artist,
  artworkUrl,
  createdAt,
  index,
  price,
  title,
  trackId,
  trackName,
}: NotificationProps) => {
  return (
    <div className={classNames('flex cursor-pointer flex-col p-4', index % 2 === 0 ? 'bg-gray-25' : 'bg-gray-20')}>
      <div className="flex flex-col break-words">
        <div className="inline-block w-full items-center text-sm text-gray-100">{title}</div>
        <Timestamp small datetime={createdAt} className="text-sm" />
      </div>
      <NextLink href={`/tracks/${trackId}`}>
        <div className="mt-4 flex cursor-pointer items-center gap-3 rounded-lg bg-gray-30 p-3">
          <div className="relative h-10 w-10">
            <Asset src={artworkUrl} sizes="2.5rem" />
          </div>
          <div>
            <div className="text-xs font-bold text-white">{trackName}</div>
            <div className="text-xs font-bold text-gray-80">{artist}</div>
          </div>
          <Matic className="ml-auto" value={price} />
        </div>
      </NextLink>
    </div>
  )
}
