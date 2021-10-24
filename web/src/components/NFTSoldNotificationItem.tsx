import classNames from 'classnames';
import { Matic } from 'icons/Matic';
import { NftSoldNotification } from 'lib/graphql';
import NextLink from 'next/link';
import React from 'react';
import { Avatar } from './Avatar';
import { Timestamp } from './Timestamp';

interface NFTSoldNotificationProps {
  notification: NftSoldNotification;
  index: number;
}

export const NFTSoldNotificationItem = ({
  notification: { buyerName, createdAt, buyerPicture, price, trackId },
  index,
}: NFTSoldNotificationProps) => {
  return (
    <NextLink href={`/tracks/${trackId}`}>
      <div className={classNames('flex flex-col p-4', index % 2 === 0 ? 'bg-gray-25' : 'bg-gray-20')}>
        <div className="break-words flex">
          <div className="flex items-center pr-4 min-w-[50px]">
            <Avatar profile={{ profilePicture: buyerPicture }} pixels={40} />
            <div className="relative">
              <Matic className="absolute -right-1" />
            </div>
          </div>
          <div>
            <div className="text-gray-100 text-sm items-center w-full inline-block">
              <span className="font-semibold">{buyerName}</span> just bought your NFT at the price {price} MATIC
            </div>
            <Timestamp small datetime={createdAt} className="text-sm" />
          </div>
        </div>
      </div>
    </NextLink>
  );
};
