import React from 'react'

import classNames from 'classnames'
import { Avatar } from 'components/Avatar'
import { Timestamp } from 'components/Timestamp'
import { NewFollowerBadge } from 'icons/NewFollowerBadge'
import { FollowerNotification } from 'lib/graphql'
import Link from 'next/link'

interface FollowerNotificationProps {
  notification: FollowerNotification
  index: number
}

export const FollowerNotificationItem = ({
  notification: { link, createdAt, followerName, followerPicture },
  index,
}: FollowerNotificationProps) => {
  return (
    <Link href={link} passHref>
      <div className={classNames('flex cursor-pointer flex-col p-4', index % 2 === 0 ? 'bg-gray-25' : 'bg-gray-20')}>
        <div className="flex break-words">
          <div className="flex min-w-[50px] items-center pr-4">
            <Avatar profile={{ profilePicture: followerPicture }} linkToProfile={false} pixels={40} />
            <div className="relative">
              <NewFollowerBadge className="absolute -right-1" />
            </div>
          </div>
          <div>
            <div className="inline-block w-full items-center text-sm text-gray-100">
              <div className="flex flex-wrap">
                <div className="font-semibold">{followerName}</div>&nbsp;started following you.
              </div>
            </div>
            <Timestamp small datetime={createdAt} className="text-sm" />
          </div>
        </div>
      </div>
    </Link>
  )
}
