import { CommentNotification, useNotificationQuery } from 'lib/graphql';
import NextLink from 'next/link';
import React, { useEffect } from 'react';
import { Avatar } from './Avatar';
import { Label } from './Label';
import { Timestamp } from './Timestamp';

interface NotificationProps {
  notificationId: string;
}

export const Notification = ({ notificationId }: NotificationProps) => {
  const { data } = useNotificationQuery({ variables: { id: notificationId } });
  const notification = data?.notification;

  useEffect(() => {
    console.log(data);
  }, [data]);

  if (!notification) return <Label>Loading</Label>;

  if (notification.__typename === 'CommentNotification') {
    const { link, createdAt, body } = notification as CommentNotification;
    return (
      <div>
        <NextLink href={link}>
          <div className="p-4 bg-gray-20 break-words">
            <div className="flex items-center">
              <Avatar />
              <Timestamp datetime={createdAt} className="flex-1 text-right" />
            </div>
            <div className="mt-4 text-gray-100 break-words">{body}</div>
          </div>
        </NextLink>
      </div>
    );
  }

  return null;
};
