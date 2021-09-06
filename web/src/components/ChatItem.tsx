import classNames from 'classnames';
import { NewFollowerBadge } from 'icons/NewFollowerBadge';
import { Chat } from 'lib/graphql';
import NextLink from 'next/link';
import React from 'react';
import { Avatar } from './Avatar';
import { Timestamp } from './Timestamp';

interface FollowerNotificationProps {
  chatItem: Chat;
}

export const ChatItem = ({
  chatItem: {
    id,
    message,
    profile: { displayName, profilePicture },
    createdAt,
  },
}: FollowerNotificationProps) => {
  return (
    <NextLink href={`/messages/${id}`}>
      <div className={classNames('flex flex-col p-4 odd:bg-gray-25 bg-gray-20')}>
        <div className="break-words flex">
          <div className="flex items-center pr-4">
            <Avatar profile={{ profilePicture: profilePicture }} pixels={40} />
            <div className="relative">
              <NewFollowerBadge className="absolute -right-1" />
            </div>
          </div>
          <div>
            <div className="text-gray-100  flex text-sm">
              <div className="font-semibold">{displayName}</div>&nbsp;{message}
            </div>
            <Timestamp small datetime={createdAt} className="text-sm" />
          </div>
        </div>
      </div>
    </NextLink>
  );
};
