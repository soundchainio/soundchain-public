import { useCallback, useEffect } from 'react'

import { useNotificationCountLazyQuery } from 'lib/graphql'
import { useRouter } from 'next/router'

export const NotificationBadge = () => {
  const [fetchNotificationCount, { data, refetch }] = useNotificationCountLazyQuery({ fetchPolicy: 'no-cache' })
  const router = useRouter()

  const refetchNotificationCount = useCallback(() => {
    refetch().catch(error => console.error('Failed to refetch notification count:', error))
  }, [refetch])

  useEffect(() => {
    fetchNotificationCount()

    // Poll every 60 seconds to save battery
    let intervalId = setInterval(refetchNotificationCount, 60000)

    // Pause polling when tab is hidden to save battery
    const handleVisibility = () => {
      if (document.hidden) {
        clearInterval(intervalId)
      } else {
        refetchNotificationCount()
        intervalId = setInterval(refetchNotificationCount, 60000)
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      clearInterval(intervalId)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [router.pathname, fetchNotificationCount, refetchNotificationCount])

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
