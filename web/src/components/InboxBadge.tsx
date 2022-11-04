import { useUnreadMessageCountLazyQuery } from 'lib/graphql'
import { useRouter } from 'next/router'
import { useEffect } from 'react'

export interface InboxBadgeProps {
  showUnreadCount?: boolean
}

export const InboxBadge = ({ showUnreadCount = true }: InboxBadgeProps) => {
  const [fetchUnreadMessagesCount, { data }] = useUnreadMessageCountLazyQuery({ fetchPolicy: 'no-cache' })
  const router = useRouter()
  const defaultClasses = showUnreadCount ? 'top-[-2px] h-3 w-3' : 'top-[-1px] h-2 w-2'

  useEffect(() => {
    fetchUnreadMessagesCount()
  }, [router.pathname, fetchUnreadMessagesCount])

  return (
    <>
      {data && data.myProfile.unreadMessageCount > 0 && (
        <div
          className={`absolute -right-1 ${defaultClasses} rounded-full bg-red-700 text-center text-xxs font-semibold text-white`}
        >
          {showUnreadCount && <span>{data.myProfile.unreadMessageCount}</span>}
        </div>
      )}
    </>
  )
}
