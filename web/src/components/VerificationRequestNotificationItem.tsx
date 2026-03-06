import React from 'react'

import classNames from 'classnames'
import { Timestamp } from 'components/Timestamp'
import { VerificationRequestNotification } from 'lib/graphql'
import NextLink from 'next/link'

interface VerificationRequestNotificationProps {
  notification: VerificationRequestNotification
  index: number
}

export const VerificationRequestNotificationItem = ({
  notification: { body, createdAt },
  index,
}: VerificationRequestNotificationProps) => {
  return (
    <NextLink href="/get-verified">
      <div
        className={classNames(
          'flex cursor-pointer flex-col rounded-lg p-4',
          index % 2 === 0 ? 'bg-gray-25' : 'bg-gray-20',
        )}
      >
        <div className="flex break-words">
          <div>
            <div className="inline-block w-full items-center text-sm text-gray-100">
              <span className="flex flex-wrap">{body}</span>
            </div>
            <Timestamp small datetime={createdAt} className="text-sm" />
          </div>
        </div>
      </div>
    </NextLink>
  )
}
