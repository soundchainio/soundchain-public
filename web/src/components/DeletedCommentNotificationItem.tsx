import classNames from 'classnames'
import { DeletedCommentNotification } from 'lib/graphql'
import React from 'react'
import { Timestamp } from './Timestamp'

interface DeletedCommentNotificationProps {
  notification: DeletedCommentNotification
  index: number
}

export const DeletedCommentNotificationItem = ({
  notification: { createdAt, previewBody },
  index,
}: DeletedCommentNotificationProps) => {
  return (
    <div className={classNames('flex flex-col p-4', index % 2 === 0 ? 'bg-gray-25' : 'bg-gray-20')}>
      <div className="flex break-words">
        <div>
          <div className="inline-block w-full items-center text-sm text-gray-100">
            <span className="flex flex-wrap">The following comment was removed by an admin from our platform</span>
          </div>
          <Timestamp small datetime={createdAt} className="text-sm" />
        </div>
      </div>
      <div className="mt-4 flex">
        <div className="w-full break-words rounded-xl bg-gray-30 p-4 text-sm text-gray-100">{previewBody}</div>
      </div>
    </div>
  )
}
