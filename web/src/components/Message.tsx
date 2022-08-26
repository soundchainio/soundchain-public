import classNames from 'classnames'
import { format } from 'date-fns'
import { useMe } from 'hooks/useMe'
import { Message as MessageItem, useMessageQuery } from 'lib/graphql'
import { Avatar } from './Avatar'
import { MessageSkeleton } from './MessageSkeleton'
import { Timestamp } from './Timestamp'

interface MessageProps {
  messageId: string
  nextMessage?: MessageItem
}

const TIMESTAMP_FORMAT = 'MM/dd/yyy, hh:mmaaa'

const getTimestamp = (timestamp: string) => {
  return format(new Date(timestamp), TIMESTAMP_FORMAT)
}

export const Message = ({ messageId, nextMessage }: MessageProps) => {
  const me = useMe()
  const { data } = useMessageQuery({ variables: { id: messageId } })
  const message = data?.message

  if (!message) return <MessageSkeleton />

  const { message: messageBody, fromProfile } = message

  const isLastMessage =
    !nextMessage || getTimestamp(message.createdAt) !== getTimestamp(nextMessage.createdAt)
      ? true
      : message.fromProfile.id !== nextMessage.fromProfile.id

  const isMyMessage = me?.profile.id === message.fromProfile.id

  return (
    <div className={classNames('flex w-full flex-col', isMyMessage && 'items-end')}>
      <div className={classNames('flex flex-row', isMyMessage ? 'pl-12' : 'pr-12')}>
        {!isMyMessage && (
          <div className="w-12">{isLastMessage && <Avatar profile={fromProfile} className="mr-2 mt-2" />}</div>
        )}
        <div className="flex w-full flex-col">
          <div
            style={{ width: 'fit-content' }}
            className={classNames(
              'flex w-full rounded-t-xl py-1 px-4',
              isMyMessage ? 'bg-purple-gradient self-end rounded-bl-xl' : 'rounded-br-xl bg-gray-20',
            )}
          >
            <pre
              style={{ overflowWrap: 'anywhere' }}
              className={classNames(
                'w-full whitespace-pre-wrap py-2 text-sm font-thin tracking-wide text-white',
                isMyMessage && 'text-right',
              )}
            >
              {messageBody}
            </pre>
          </div>
          {isLastMessage && (
            <Timestamp
              datetime={message.createdAt}
              format={TIMESTAMP_FORMAT}
              small
              className={classNames('pt-1', isMyMessage && 'text-right')}
            />
          )}
        </div>
      </div>
    </div>
  )
}
