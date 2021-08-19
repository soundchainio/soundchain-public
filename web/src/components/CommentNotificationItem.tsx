import { Comment } from 'icons/Comment';
import { CommentNotification } from 'lib/graphql';
import NextLink from 'next/link';
import React from 'react';
import { Avatar } from './Avatar';
import { Timestamp } from './Timestamp';

interface CommentNotificationProps {
  notification: CommentNotification;
}

export const CommentNotificationItem = ({
  notification: { link, body, createdAt, previewBody, author },
}: CommentNotificationProps) => {
  return (
    <NextLink href={link}>
      <div className="flex flex-col bg-gray-20 p-4">
        <div className="break-words flex">
          <div className="flex items-center pr-4">
            <Avatar src={''} pixels={40} />
            <div className="relative">
              <Comment className="absolute -right-1" />
            </div>
          </div>
          <div>
            <div className="text-gray-100  flex text-sm">
              <div className="font-semibold">{author}</div>&nbsp;{body}
            </div>
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
