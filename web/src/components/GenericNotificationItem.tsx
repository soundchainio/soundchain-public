import React from 'react'
import classNames from 'classnames'
import { Avatar } from 'components/Avatar'
import { Timestamp } from 'components/Timestamp'
import { GenericNotification } from 'lib/graphql'
import Link from 'next/link'
import { AtSign } from 'lucide-react'

interface GenericNotificationItemProps {
  notification: GenericNotification
  index: number
}

export const GenericNotificationItem = ({
  notification: { link, createdAt, body, actorName, actorPicture, type },
  index,
}: GenericNotificationItemProps) => {
  const isMention = type === 'Mention'

  return (
    <Link href={link} passHref>
      <div
        className={classNames(
          'flex cursor-pointer flex-col rounded-lg p-4',
          index % 2 === 0 ? 'bg-gray-25' : 'bg-gray-20',
        )}
      >
        <div className="flex break-words">
          <div className="flex min-w-[50px] items-center pr-4">
            {actorPicture ? (
              <Avatar profile={{ profilePicture: actorPicture } as any} linkToProfile={false} pixels={40} />
            ) : (
              <div className="w-10 h-10 rounded-full bg-neutral-700 flex items-center justify-center">
                <AtSign className="w-5 h-5 text-cyan-400" />
              </div>
            )}
            {isMention && (
              <div className="relative">
                <div className="absolute -right-1 -bottom-1 w-5 h-5 bg-cyan-500 rounded-full flex items-center justify-center">
                  <AtSign className="w-3 h-3 text-white" />
                </div>
              </div>
            )}
          </div>
          <div>
            <div className="inline-block w-full items-center text-sm text-gray-100">
              <div className="flex flex-wrap">
                {actorName && <div className="font-semibold">{actorName}</div>}
                &nbsp;{body || 'sent you a notification'}
              </div>
            </div>
            <Timestamp small datetime={createdAt} className="text-sm" />
          </div>
        </div>
      </div>
    </Link>
  )
}
