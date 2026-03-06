import React from 'react'

import classNames from 'classnames'
import { Avatar } from 'components/Avatar'
import { Timestamp } from 'components/Timestamp'
import { ReactionEmoji } from 'icons/ReactionEmoji'
import { ThumbsUpNotification } from 'icons/ThumbsUpNotification'
import { ReactionNotification } from 'lib/graphql'
import NextLink from 'next/link'

import { PreviewPostNotification } from './PreviewPostNotification'

interface ReactionNotificationProps {
  notification: ReactionNotification
  index: number
}

export const ReactionNotificationItem = ({
  notification: { link, authorPicture, authorName, createdAt, reactionType, postId },
  index,
}: ReactionNotificationProps) => {
  return (
    <NextLink href={link}>
      <div
        className={classNames(
          'flex cursor-pointer flex-col rounded-lg p-4',
          index % 2 === 0 ? 'bg-gray-25' : 'bg-gray-20',
        )}
      >
        <div className="flex break-words">
          <div className="flex min-w-[50px] items-center pr-4">
            <Avatar profile={{ profilePicture: authorPicture }} linkToProfile={false} pixels={40} />
            <div className="relative">
              <ThumbsUpNotification className="absolute -right-1" />
            </div>
          </div>
          <div>
            <div className="inline-block w-full items-center text-sm text-gray-100">
              <span className="flex flex-wrap">
                <div className="font-semibold">{typeof authorName === 'object' ? (authorName as any)?.displayName || 'Someone' : authorName}</div>
                &nbsp;reacted
                <ReactionEmoji key={reactionType} name={reactionType} className="ml-2 mr-2 h-6 w-6" />
                to your post.
              </span>
            </div>
            <Timestamp small datetime={createdAt} className="text-sm" />
          </div>
        </div>
        <PreviewPostNotification postId={postId} />
      </div>
    </NextLink>
  )
}
