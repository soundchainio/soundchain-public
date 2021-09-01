import classNames from 'classnames';
import { ReactionEmoji } from 'icons/ReactionEmoji';
import { ThumbsUpNotification } from 'icons/ThumbsUpNotification';
import { ReactionNotification } from 'lib/graphql';
import NextLink from 'next/link';
import React from 'react';
import { Avatar } from './Avatar';
import { PreviewPostNotification } from './PreviewPostNotification';
import { Timestamp } from './Timestamp';

interface ReactionNotificationProps {
  notification: ReactionNotification;
  index: number;
}

export const ReactionNotificationItem = ({
  notification: { link, authorPicture, authorName, createdAt, reactionType, postId },
  index,
}: ReactionNotificationProps) => {
  return (
    <NextLink href={link}>
      <div className={classNames('flex flex-col p-4', index % 2 === 0 ? 'bg-gray-25' : 'bg-gray-20')}>
        <div className="break-words flex">
          <div className="flex items-center pr-4">
            <Avatar profile={{ profilePicture: authorPicture }} pixels={40} />
            <div className="relative">
              <ThumbsUpNotification className="absolute -right-1" />
            </div>
          </div>
          <div>
            <div className="text-gray-100 flex text-sm items-center">
              <div className="font-semibold">{authorName}</div>
              &nbsp; reacted
              <ReactionEmoji key={reactionType} name={reactionType} className="w-6 h-6 ml-2 mr-2 mb-1" />
              to your post.
            </div>
            <Timestamp small datetime={createdAt} className="text-sm" />
          </div>
        </div>
        <div className="flex mt-4">
          <PreviewPostNotification postId={postId} />
        </div>
      </div>
    </NextLink>
  );
};
