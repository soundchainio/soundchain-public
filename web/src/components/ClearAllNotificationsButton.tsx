import classNames from 'classnames'
import { useState } from 'react'
import { useApolloClient } from '@apollo/client'

import { Button } from './common/Buttons/Button'

interface ClearAllNotificationsButtonProps {
  className?: string
}
export const ClearAllNotificationsButton = (props: ClearAllNotificationsButtonProps) => {
  const { className } = props
  const [loading, setLoading] = useState(false)
  const apollo = useApolloClient()

  const onClick = async () => {
    setLoading(true)
    try {
      await fetch('/api/notifications/clear', {
        method: 'POST',
        credentials: 'include',
      })
      apollo.refetchQueries({ include: ['Notifications'] }).catch(() => {})
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button className={classNames(className, 'text-white')} variant="clear" onClick={onClick} disabled={loading}>
      Clear All
    </Button>
  )
}
