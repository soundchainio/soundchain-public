import { InboxBadge } from 'components/InboxBadge'
import { NotificationBadge } from 'components/NotificationBadge'
import { useMe } from 'hooks/useMe'
import { Bell } from 'icons/Bell'
import { Inbox } from 'icons/Inbox'
import { NavBarButton } from './NavBarButton'

export const InboxButton = ({ showLabel }: { showLabel?: boolean }) => {
  const me = useMe()

  const InboxBadgeWrapper = () => {
    return <InboxBadge showUnreadCount={true} />
  }

  return (
    <div className="flex items-end">
      <div className="relative mr-2">
        <NavBarButton
          label="Alerts"
          path={me ? '/notifications' : '/login'}
          icon={Bell}
          badge={me ? NotificationBadge : undefined}
          alwaysShowLabel={showLabel}
        />
      </div>
      <div className="relative">
        <NavBarButton
          label="Inbox"
          path={me ? '/messages' : '/login'}
          icon={Inbox}
          badge={me ? InboxBadgeWrapper : undefined}
          alwaysShowLabel={showLabel}
        />
      </div>
    </div>
  )
}
