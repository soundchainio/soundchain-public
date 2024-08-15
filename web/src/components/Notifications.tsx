import React, { useEffect } from 'react'

import {
  NotificationCountDocument,
  SortNotificationField,
  SortOrder,
  useNotificationsQuery,
  useResetNotificationCountMutation,
} from 'lib/graphql'

import CircleLoading from './CircleLoading'
import { ClearAllNotificationsButton } from './ClearAllNotificationsButton'
import { SoundChainPopOverChildProps } from './common/PopOverButton/PopOverButton'
import { NoResultFound } from './NoResultFound'
import { Notification as NotificationItem } from './Notification'

export const Notifications: React.FC<SoundChainPopOverChildProps> = ({ closePopOver }) => {
  const [resetNotificationCount] = useResetNotificationCountMutation()

  const { data, loading } = useNotificationsQuery({
    variables: { sort: { field: SortNotificationField.CreatedAt, order: SortOrder.Desc } },
    fetchPolicy: 'no-cache',
  })

  useEffect(() => {
    resetNotificationCount({ refetchQueries: [NotificationCountDocument] })
  }, [resetNotificationCount])

  if (loading) {
    return (
      <div className="flex h-[300px] w-full items-center justify-center p-8">
        <CircleLoading />
      </div>
    )
  }

  if (!data) {
    return <NoResultFound type="alerts" />
  }

  if (data.notifications.nodes.length <= 0) {
    return (
      <div className="flex h-[300px] w-full items-center justify-center p-8">
        <h2 className="p-8 text-center font-semibold text-white">No notifications</h2>
      </div>
    )
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between rounded-lg bg-gray-20 py-2 px-4">
        <h2 className="text-lg font-semibold text-white">Notifications</h2>
        <ClearAllNotificationsButton className="text-gray-80 hover:text-white" />
      </div>

      <div className="my-4 flex flex-col gap-4">
        {data.notifications.nodes.map((notification, index) => (
          <NotificationItem key={index} index={index} notificationId={notification.id} closePopOver={closePopOver} />
        ))}
      </div>
    </div>
  )
}
