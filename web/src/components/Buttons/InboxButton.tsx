import { InboxBadge } from 'components/InboxBadge';
import { Inbox } from 'icons/Inbox';
import React from 'react';
import { NavBarLink } from './NavBarLink';

export const InboxButton = () => {
  return (
    <div className="relative">
      <InboxBadge />
      <NavBarLink label="Inbox" path="/messages" icon={Inbox} activatedColor="yellow" />
    </div>
  );
};
