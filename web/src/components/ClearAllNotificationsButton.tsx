import classNames from 'classnames'
import { useClearNotificationsMutation } from 'lib/graphql'

import { Button } from './common/Buttons/Button'

interface ClearAllNotificationsButtonProps {
  className?: string
}
export const ClearAllNotificationsButton = (props: ClearAllNotificationsButtonProps) => {
  const { className } = props

  const [clearNotification, { loading }] = useClearNotificationsMutation({ refetchQueries: ['Notifications'] })

  const onClick = () => {
    clearNotification()
  }

  return (
    <Button className={classNames(className, 'text-white')} variant="clear" onClick={onClick} disabled={loading}>
      Clear All
    </Button>
  )
}
