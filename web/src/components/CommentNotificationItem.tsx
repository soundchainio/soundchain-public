import { CommentNotification } from 'lib/graphql';
import NextLink from 'next/link';
import React from 'react';
import { Avatar } from './Avatar';
import { Timestamp } from './Timestamp';

interface CommentNotificationProps {
  notification: CommentNotification;
}

export const CommentNotificationItem = ({
  notification: { link, body, createdAt, previewBody },
}: CommentNotificationProps) => {
  return (
    <NextLink href={link}>
      <div className="flex flex-col bg-gray-20 p-4 ">
        <div className="break-words flex flex-row">
          <div className="flex items-center pr-6">
            <Avatar src={''} pixels={40} />
          </div>
          <div>
            <div className="text-gray-100 break-words flex">{body}</div>
            <Timestamp datetime={createdAt} />
          </div>
        </div>
        <div className="flex flex-1 mt-4">
          <div className="p-4 bg-gray-30 w-full break-words text-white rounded-xl text-sm">{previewBody}</div>
        </div>
      </div>
    </NextLink>
  );
};
