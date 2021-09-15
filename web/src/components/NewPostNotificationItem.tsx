import classNames from 'classnames';
import { NewPostNotification as NewPostIcon } from 'icons/NewPostNotification';
import { NewPostNotification } from 'lib/graphql';
import NextLink from 'next/link';
import React from 'react';
import { Avatar } from './Avatar';
import { Timestamp } from './Timestamp';

interface NewPostNotificationProps {
  notification: NewPostNotification;
  index: number;
}

export const NewPostNotificationItem = ({
  notification: { link, body, createdAt, previewBody, authorName, authorPicture },
  index,
}: NewPostNotificationProps) => {
  return (
    <NextLink href={link}>
      <div className={classNames('flex flex-col p-4', index % 2 === 0 ? 'bg-gray-25' : 'bg-gray-20')}>
        <div className="break-words flex">
          <div className="flex items-center pr-4">
            <Avatar profile={{ profilePicture: authorPicture }} pixels={40} />
            <div className="relative">
              <NewPostIcon className="absolute -right-1" />
            </div>
          </div>
          <div>
            <div className="text-gray-100  flex text-sm">
              <div className="font-semibold">{authorName}</div>&nbsp;{body}
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
