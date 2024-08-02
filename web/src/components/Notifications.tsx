import React, { useEffect } from 'react'

import {
  NotificationCountDocument,
  SortNotificationField,
  SortOrder,
  useNotificationsQuery,
  useResetNotificationCountMutation,
} from 'lib/graphql'

import { ClearAllNotificationsButton } from './ClearAllNotificationsButton'
import { SoundChainPopOverChildProps } from './common/PopOverButton/PopOverButton'
import { NoResultFound } from './NoResultFound'
import { Notification as NotificationItem } from './Notification'

export const Notifications: React.FC<SoundChainPopOverChildProps> = ({ closePopOver }) => {
  const [resetNotificationCount] = useResetNotificationCountMutation()

  const { data } = useNotificationsQuery({
    variables: { sort: { field: SortNotificationField.CreatedAt, order: SortOrder.Desc } },
    fetchPolicy: 'no-cache',
  })

  useEffect(() => {
    resetNotificationCount({ refetchQueries: [NotificationCountDocument] })
  }, [resetNotificationCount])

  if (!data) {
    return <NoResultFound type="alerts" />
  }

  if (data.notifications.nodes.length <= 0) {
    return <h2 className="p-8 text-center font-semibold text-white">No notifications</h2>
  }

  return (
    <div className="p-4">
      <ClearAllNotificationsButton className="w-full text-right" />

      {data.notifications.nodes.map((notification, index) => (
        <NotificationItem key={index} index={index} notificationId={notification.id} closePopOver={closePopOver} />
      ))}
    </div>
  )
}
