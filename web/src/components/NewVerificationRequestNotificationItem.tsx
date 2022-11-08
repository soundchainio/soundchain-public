import classNames from 'classnames'
import { NewVerificationRequestNotification } from 'lib/graphql'
import NextLink from 'next/link'
import React from 'react'
import { Timestamp } from 'components/Timestamp'

interface NewVerificationRequestNotificationItemProps {
  notification: NewVerificationRequestNotification
  index: number
}

export const NewVerificationRequestNotificationItem = ({
  notification: { verificationRequestId, createdAt },
  index,
}: NewVerificationRequestNotificationItemProps) => {
  return (
    <NextLink href={'/manage-requests/' + verificationRequestId}>
      <div className={classNames('flex cursor-pointer flex-col p-4', index % 2 === 0 ? 'bg-gray-25' : 'bg-gray-20')}>
        <div className="flex break-words">
          <div>
            <div className="inline-block w-full items-center text-sm text-gray-100">
              <span className="flex flex-wrap">An user requested to be verified! Click here to review.</span>
            </div>
            <Timestamp small datetime={createdAt} className="text-sm" />
          </div>
        </div>
      </div>
    </NextLink>
  )
}
