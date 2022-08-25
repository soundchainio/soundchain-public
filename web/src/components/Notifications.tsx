import { SortNotificationField, SortOrder, useNotificationsQuery } from 'lib/graphql'
import React from 'react'
import { NoResultFound } from './NoResultFound'
import { Notification as NotificationItem } from './Notification'
import { NotificationSkeleton } from './NotificationSkeleton'

export const Notifications = () => {
  const { data, loading } = useNotificationsQuery({
    variables: { sort: { field: SortNotificationField.CreatedAt, order: SortOrder.Desc } },
    fetchPolicy: 'no-cache',
  })

  if (loading) {
    return <NotificationSkeleton />
  }

  if (!data) {
    return <NoResultFound type="alerts" />
  }

  return (
    <div>
      {data.notifications.nodes.map((notification, index) => (
        <NotificationItem key={index} index={index} notificationId={notification.id} />
      ))}
    </div>
  )
}
