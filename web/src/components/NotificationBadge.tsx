import { useNotificationCountLazyQuery } from 'lib/graphql'
import { useRouter } from 'next/router'
import { useEffect } from 'react'

export const NotificationBadge = () => {
  const [fetchNotificationCount, { data }] = useNotificationCountLazyQuery({ fetchPolicy: 'no-cache' })
  const router = useRouter()

  useEffect(() => {
    fetchNotificationCount()
  }, [router.pathname, fetchNotificationCount])

  return (
    <>
      {data && data.myProfile.unreadNotificationCount > 0 && (
        <div className="absolute -right-2 -top-2 h-4 w-4 rounded-full bg-red-700 text-center text-xs font-semibold text-white">
          <span>{data.myProfile.unreadNotificationCount}</span>
        </div>
      )}
    </>
  )
}
