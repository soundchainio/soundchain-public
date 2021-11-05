import classNames from 'classnames';
import { VerificationRequestNotification } from 'lib/graphql';
import NextLink from 'next/link';
import React from 'react';
import { Timestamp } from './Timestamp';

interface VerificationRequestNotificationProps {
  notification: VerificationRequestNotification;
  index: number;
}

export const VerificationRequestNotificationItem = ({
  notification: { body, createdAt },
  index,
}: VerificationRequestNotificationProps) => {
  return (
    <NextLink href="/get-verified">
      <div className={classNames('flex flex-col p-4', index % 2 === 0 ? 'bg-gray-25' : 'bg-gray-20')}>
        <div className="break-words flex">
          <div>
            <div className="text-gray-100 text-sm items-center w-full inline-block">
              <span className="flex flex-wrap">{body}</span>
            </div>
            <Timestamp small datetime={createdAt} className="text-sm" />
          </div>
        </div>
      </div>
    </NextLink>
  );
};
