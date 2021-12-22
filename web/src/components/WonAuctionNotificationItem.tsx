import classNames from 'classnames';
import { Matic } from 'icons/Matic';
import { WonAuctionNotification } from 'lib/graphql';
import NextLink from 'next/link';
import React from 'react';
import Asset from './Asset';
import { Timestamp } from './Timestamp';

interface NotificationProps {
  notification: WonAuctionNotification;
  index: number;
}

export const WonAuctionNotificationItem = ({
  notification: { createdAt, price, trackId, trackName, artist, artworkUrl },
  index,
}: NotificationProps) => {
  return (
    <div className={classNames('cursor-pointer flex flex-col p-4', index % 2 === 0 ? 'bg-gray-25' : 'bg-gray-20')}>
      <div className="break-words flex flex-col">
        <div className="text-gray-100 text-sm items-center w-full inline-block">
          <span className="font-semibold">You</span> won the auction! Please complete the auction to get your NFT!
        </div>
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
          <div className="flex gap-2 text-white font-bold text-xs ml-auto">
            <Matic /> {price / 1e18} MATIC
          </div>
        </div>
      </NextLink>
    </div>
  );
};
