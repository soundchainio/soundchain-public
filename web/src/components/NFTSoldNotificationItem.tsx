import classNames from 'classnames';
import { Matic } from 'icons/Matic';
import { NftSoldNotification, SellType } from 'lib/graphql';
import NextLink from 'next/link';
import React from 'react';
import Asset from './Asset';
import { Avatar } from './Avatar';
import { Timestamp } from './Timestamp';

interface NFTSoldNotificationProps {
  notification: NftSoldNotification;
  index: number;
}

export const NFTSoldNotificationItem = ({
  notification: { buyerName, createdAt, buyerPicture, price, trackId, trackName, artist, artworkUrl, sellType },
  index,
}: NFTSoldNotificationProps) => {
  return (
    <div className={classNames('cursor-pointer flex flex-col p-4', index % 2 === 0 ? 'bg-gray-25' : 'bg-gray-20')}>
      <div className="break-words flex">
        <div className="flex items-center pr-4 min-w-[50px]">
          <Avatar profile={{ profilePicture: buyerPicture }} linkToProfile={false} pixels={40} />
          <div className="relative">
            <Matic className="absolute -right-1" />
          </div>
        </div>
        <div>
          {sellType === SellType.BuyNow && (
            <div className="text-gray-100 text-sm items-center w-full inline-block">
              <span className="font-semibold">{buyerName}</span> purchased your NFT:
            </div>
          )}
          {sellType === SellType.Auction && (
            <div className="text-gray-100 text-sm items-center w-full inline-block">
              <span className="font-semibold">{buyerName}</span> won the auction:
            </div>
          )}
          <Timestamp small datetime={createdAt} className="text-sm" />
        </div>
      </div>
      <NextLink href={`/tracks/${trackId}`}>
        <div className="flex items-center gap-3 p-3 bg-gray-30 rounded-lg cursor-pointer mt-4">
          <div className="w-10 h-10 relative">
            <Asset src={artworkUrl} />
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
