import classNames from 'classnames'
import { CircleRightArrow } from 'icons/CircleRightArrow'
import { Chat } from 'lib/graphql'
import NextLink from 'next/link'
import { Avatar } from 'components/Avatar'
import { DisplayName } from 'components/DisplayName'
import { Timestamp } from 'components/Timestamp'

interface FollowerNotificationProps {
  chatItem: Chat
}

export const ChatItem = ({
  chatItem: {
    id,
    message,
    profile: { displayName, profilePicture, verified, teamMember, userHandle, badges },
    createdAt,
    unread,
  },
}: FollowerNotificationProps) => {
  return (
    <NextLink href={`/messages/${id}`}>
      <a
        className={classNames(
          'flex w-full flex-col py-4 pl-2 pr-4',
          unread ? 'bg-gray-20 odd:bg-gray-25' : 'bg-gray-15',
        )}
      >
        <div className="flex items-center">
          <div className="mr-2 flex w-2 items-center self-center">
            <div className={classNames('h-[6px] w-[6px] rounded-full', unread && 'bg-purple-gradient')}></div>
          </div>
          <Avatar
            linkToProfile={false}
            className="flex w-[40px]"
            profile={{ profilePicture, userHandle }}
            pixels={40}
          />
          <div className="flex-1 truncate px-4">
            <DisplayName name={displayName} verified={verified} teamMember={teamMember} badges={badges} />
            <div className="flex whitespace-nowrap text-sm text-gray-80">
              <div className="truncate">{`${message}`}</div>&nbsp;<div className="text-gray-40">•</div>
              &nbsp;
              <Timestamp small datetime={createdAt} className="text-sm" />
            </div>
          </div>
          <CircleRightArrow />
        </div>
      </a>
    </NextLink>
  )
}
