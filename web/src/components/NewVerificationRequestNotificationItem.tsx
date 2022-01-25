import classNames from 'classnames';
import { NewVerificationRequestNotification } from 'lib/graphql';
import NextLink from 'next/link';
import React from 'react';
import { Timestamp } from './Timestamp';

interface NewVerificationRequestNotificationItemProps {
  notification: NewVerificationRequestNotification;
  index: number;
}

export const NewVerificationRequestNotificationItem = ({
  notification: { verificationRequestId, createdAt },
  index,
}: NewVerificationRequestNotificationItemProps) => {
  return (
    <NextLink href={'/manage-requests/' + verificationRequestId}>
      <div className={classNames('cursor-pointer flex flex-col p-4', index % 2 === 0 ? 'bg-gray-25' : 'bg-gray-20')}>
        <div className="break-words flex">
          <div>
            <div className="text-gray-100 text-sm items-center w-full inline-block">
              <span className="flex flex-wrap">An user requested to be verified! Click here to review.</span>
            </div>
            <Timestamp small datetime={createdAt} className="text-sm" />
          </div>
        </div>
      </div>
    </NextLink>
  );
};
