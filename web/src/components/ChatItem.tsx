import classNames from 'classnames';
import { CircleRightArrow } from 'icons/CircleRightArrow';
import { Chat } from 'lib/graphql';
import NextLink from 'next/link';
import React from 'react';
import { Avatar } from './Avatar';
import { DisplayName } from './DisplayName';
import { Timestamp } from './Timestamp';

interface FollowerNotificationProps {
  chatItem: Chat;
}

export const ChatItem = ({
  chatItem: {
    id,
    message,
    profile: { displayName, profilePicture, verified, teamMember, userHandle },
    createdAt,
    unread,
  },
}: FollowerNotificationProps) => {
  return (
    <NextLink href={`/messages/${id}`}>
      <a
        className={classNames(
          'w-full flex flex-col py-4 pl-2 pr-4',
          unread ? 'odd:bg-gray-25 bg-gray-20' : 'bg-gray-15',
        )}
      >
        <div className="flex items-center">
          <div className="flex w-2 self-center items-center mr-2">
            <div className={classNames('w-[6px] h-[6px] rounded-full', unread && 'bg-purple-gradient')}></div>
          </div>
          <Avatar
            linkToProfile={false}
            className="flex w-[40px]"
            profile={{ profilePicture, userHandle }}
            pixels={40}
          />
          <div className="flex-1 px-4 truncate">
            <DisplayName name={displayName} verified={verified} teamMember={teamMember} />
            <div className="text-gray-80 flex text-sm whitespace-nowrap">
              <div className="truncate">{`${message}`}</div>&nbsp;<div className="text-gray-40">•</div>
              &nbsp;
              <Timestamp small datetime={createdAt} className="text-sm" />
            </div>
          </div>
          <CircleRightArrow />
        </div>
      </a>
    </NextLink>
  );
};
