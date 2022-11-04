import classNames from 'classnames'
import { Comment } from 'icons/Comment'
import { CommentNotification } from 'lib/graphql'
import NextLink from 'next/link'
import React from 'react'
import { Avatar } from 'components/Avatar'
import { Timestamp } from 'components/Timestamp'

interface CommentNotificationProps {
  notification: CommentNotification
  index: number
}

export const CommentNotificationItem = ({
  notification: { link, body, createdAt, previewBody, authorName, authorPicture },
  index,
}: CommentNotificationProps) => {
  return (
    <NextLink href={link}>
      <div className={classNames('flex cursor-pointer flex-col p-4', index % 2 === 0 ? 'bg-gray-25' : 'bg-gray-20')}>
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
                <div className="font-semibold">{authorName}</div>&nbsp;{body}
              </div>
            </span>
            <Timestamp small datetime={createdAt} className="text-sm" />
          </div>
        </div>
        <div className="mt-4 flex">
          <div className="w-full break-words rounded-xl bg-gray-30 p-4 text-sm text-gray-100">{previewBody}</div>
        </div>
      </div>
    </NextLink>
  )
}
