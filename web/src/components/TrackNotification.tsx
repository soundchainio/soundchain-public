import classNames from 'classnames';
import { Matic } from 'icons/Matic';
import NextLink from 'next/link';
import React from 'react';
import Asset from './Asset';
import { Timestamp } from './Timestamp';

interface NotificationProps {
  artist: string;
  artworkUrl: string;
  createdAt: string;
  index: number;
  price?: number;
  title: JSX.Element | string;
  trackId: string;
  trackName: string;
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
    <div className={classNames('cursor-pointer flex flex-col p-4', index % 2 === 0 ? 'bg-gray-25' : 'bg-gray-20')}>
      <div className="break-words flex flex-col">
        <div className="text-gray-100 text-sm items-center w-full inline-block">{title}</div>
        <Timestamp small datetime={createdAt} className="text-sm" />
      </div>
      <NextLink href={`/tracks/${trackId}`}>
        <div className="flex items-center gap-3 p-3 bg-gray-30 rounded-lg cursor-pointer mt-4">
          <div className="w-10 h-10 relative">
            <Asset src={artworkUrl} sizes="2.5rem" />
          </div>
          <div>
            <div className="text-white font-bold text-xs">{trackName}</div>
            <div className="text-gray-80 font-bold text-xs">{artist}</div>
          </div>
          {price && (
            <div className="flex gap-2 text-white font-bold text-xs ml-auto">
              <Matic /> {price / 1e18} MATIC
            </div>
          )}
        </div>
      </NextLink>
    </div>
  );
};
