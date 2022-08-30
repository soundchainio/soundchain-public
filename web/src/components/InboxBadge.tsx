import { useUnreadMessageCountLazyQuery } from 'lib/graphql'
import { useRouter } from 'next/router'
import { useEffect } from 'react'

export const InboxBadge = () => {
  const [fetchUnreadMessagesCount, { data }] = useUnreadMessageCountLazyQuery({ fetchPolicy: 'no-cache' })
  const router = useRouter()

  useEffect(() => {
    fetchUnreadMessagesCount()
  }, [router.pathname, fetchUnreadMessagesCount])

  return (
    <>
      {data && data.myProfile.unreadMessageCount > 0 && (
        <div className="absolute -right-1 -top-2 h-4 w-4 rounded-full bg-red-700 text-center text-xs font-semibold text-white">
          <span>{data.myProfile.unreadMessageCount}</span>
        </div>
      )}
    </>
  )
}
