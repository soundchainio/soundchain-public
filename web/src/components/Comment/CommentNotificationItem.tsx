import React from 'react'

import classNames from 'classnames'
import { Avatar } from 'components/Avatar'
import { CloseFunction } from 'components/common/PopOverButton/PopOverButton'
import { Timestamp } from 'components/Timestamp'
import { EmoteRenderer } from 'components/EmoteRenderer'
import { Comment } from 'icons/Comment'
import { CommentNotification } from 'lib/graphql'
import NextLink from 'next/link'

interface CommentNotificationProps {
  notification: CommentNotification
  index: number
  closePopOver?: CloseFunction
}

export const CommentNotificationItem = ({
  notification: { link, body, createdAt, previewBody, authorName, authorPicture },
  index,
}: CommentNotificationProps) => {
  return (
    <NextLink href={link}>
      <div
        className={classNames(
          'group flex cursor-pointer flex-col rounded-lg p-4 transition-colors',
          index % 2 === 0 ? 'bg-gray-25' : 'bg-gray-20',
          'hover:bg-gray-30',
        )}
      >
        <div className="flex break-words">
          <div className="flex min-w-[50px] items-center pr-4">
            <Avatar profile={{ profilePicture: authorPicture }} linkToProfile={false} pixels={40} />
            <div className="relative">
              <Comment className="absolute -right-1" />
            </div>
          </div>
          <div>
            <span className="inline-block w-full items-center text-sm text-gray-100">
              <div className="flex flex-wrap">
                <div className="font-semibold">{authorName}</div>&nbsp;<EmoteRenderer text={body} />
              </div>
            </span>
            <Timestamp small datetime={createdAt} className="text-sm" />
          </div>
        </div>
        <div className="mt-4 flex">
          <div className="w-full break-words rounded-xl bg-gray-20 p-4 text-sm text-gray-100 transition-colors group-hover:bg-gray-25">
            <EmoteRenderer text={previewBody} />
          </div>
        </div>
      </div>
    </NextLink>
  )
}
