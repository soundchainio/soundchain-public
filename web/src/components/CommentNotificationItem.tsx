import classNames from 'classnames';
import { Comment } from 'icons/Comment';
import { CommentNotification } from 'lib/graphql';
import NextLink from 'next/link';
import React from 'react';
import { Avatar } from './Avatar';
import { Timestamp } from './Timestamp';

interface CommentNotificationProps {
  notification: CommentNotification;
  index: number;
}

export const CommentNotificationItem = ({
  notification: { link, body, createdAt, previewBody, authorName, authorPicture },
  index,
}: CommentNotificationProps) => {
  return (
    <NextLink href={link}>
      <div className={classNames('flex flex-col p-4', index % 2 === 0 ? 'bg-gray-25' : 'bg-gray-20')}>
        <div className="break-words flex">
          <div className="flex items-center pr-4 min-w-[50px]">
            <Avatar profile={{ profilePicture: authorPicture }} pixels={40} />
            <div className="relative">
              <Comment className="absolute -right-1" />
            </div>
          </div>
          <div>
            <span className="text-gray-100 inline-block items-center w-full text-sm">
              <div className="flex flex-wrap">
                <div className="font-semibold">{authorName}</div>&nbsp;{body}
              </div>
            </span>
            <Timestamp small datetime={createdAt} className="text-sm" />
          </div>
        </div>
        <div className="flex mt-4">
          <div className="p-4 bg-gray-30 w-full break-words text-gray-100 rounded-xl text-sm">{previewBody}</div>
        </div>
      </div>
    </NextLink>
  );
};
