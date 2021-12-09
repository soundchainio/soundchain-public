import classNames from 'classnames';
import { NewFollowerBadge } from 'icons/NewFollowerBadge';
import { FollowerNotification } from 'lib/graphql';
import NextLink from 'next/link';
import React from 'react';
import { Avatar } from './Avatar';
import { Timestamp } from './Timestamp';

interface FollowerNotificationProps {
  notification: FollowerNotification;
  index: number;
}

export const FollowerNotificationItem = ({
  notification: { link, createdAt, followerName, followerPicture },
  index,
}: FollowerNotificationProps) => {
  return (
    <NextLink href={link}>
      <div className={classNames('cursor-pointer flex flex-col p-4', index % 2 === 0 ? 'bg-gray-25' : 'bg-gray-20')}>
        <div className="break-words flex">
          <div className="flex items-center pr-4 min-w-[50px]">
            <Avatar profile={{ profilePicture: followerPicture }} linkToProfile={false} pixels={40} />
            <div className="relative">
              <NewFollowerBadge className="absolute -right-1" />
            </div>
          </div>
          <div>
            <div className="text-gray-100 w-full inline-block text-sm items-center">
              <div className="flex flex-wrap">
                <div className="font-semibold">{followerName}</div>&nbsp;started following you.
              </div>
            </div>
            <Timestamp small datetime={createdAt} className="text-sm" />
          </div>
        </div>
      </div>
    </NextLink>
  );
};
