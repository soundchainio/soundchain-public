import classNames from 'classnames';
import { CircleRightArrow } from 'icons/CircleRightArrow';
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
    unread,
  },
}: FollowerNotificationProps) => {
  return (
    <NextLink href={`/messages/${id}`}>
      <div className={'flex flex-col py-4 pl-1 pr-4 odd:bg-gray-25 bg-gray-20'}>
        <div className="break-words flex items-center">
          <div className="w-2 self-center items-center mr-2">
            <div className={classNames('w-[6px] h-[6px] rounded-full', unread && 'bg-purple-gradient')}></div>
          </div>
          <div className="flex pr-4">
            <Avatar className="flex" profile={{ profilePicture: profilePicture }} pixels={40} />
          </div>
          <div>
            <div className="font-semibold text-white flex text-sm">{displayName}</div>
            <div className="text-gray-80 flex text-sm">
              {`${message}`}&nbsp;<div className="text-gray-40">•</div>&nbsp;
              <Timestamp small datetime={createdAt} className="text-sm" />
            </div>
          </div>
          <div className="items-end ml-auto mt-auto mb-auto">
            <CircleRightArrow />
          </div>
        </div>
      </div>
    </NextLink>
  );
};
