import { InboxBadge } from 'components/InboxBadge';
import { NotificationBadge } from 'components/NotificationBadge';
import { useMe } from 'hooks/useMe';
import { Bell } from 'icons/Bell';
import { Inbox } from 'icons/Inbox';
import React from 'react';
import { NavBarButton } from './NavBarButton';

export const InboxButton = () => {
  const me = useMe();

  return (
    <div className="flex items-end">
      <div className="relative md:mt-2 mr-2">
        <NavBarButton
          label="Notifications"
          path={me ? '/notifications' : '/login'}
          icon={Bell}
          badge={me ? NotificationBadge : undefined}
          color="purple"
        />
      </div>
      <div className="relative md:mt-2">
        <InboxBadge />
        <NavBarButton
          label="Inbox"
          path={me ? '/messages' : '/login'}
          icon={Inbox}
          badge={me ? NotificationBadge : undefined}
          color="yellow"
        />
      </div>
    </div>
  );
};
