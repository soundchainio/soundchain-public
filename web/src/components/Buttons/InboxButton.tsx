import { InboxBadge } from 'components/InboxBadge';
import { Inbox } from 'icons/Inbox';
import React from 'react';
import { NavBarButton } from './NavBarButton';

export const InboxButton = () => {
  return (
    <div className="relative md:mt-2">
      <InboxBadge />
      <NavBarButton label="Inbox" path="/messages" icon={Inbox} color="yellow" />
    </div>
  );
};
