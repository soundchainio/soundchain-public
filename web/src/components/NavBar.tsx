import { useModalDispatch } from 'contexts/providers/modal';
import { useMe } from 'hooks/useMe';
import { Bell } from 'icons/Bell';
import { Happy } from 'icons/emoji/Happy';
import { Home } from 'icons/Home';
import { NewPost } from 'icons/NewPost';
import { Profile } from 'icons/Profile';
import { Search } from 'icons/Search';
import { useRouter } from 'next/router';
import React from 'react';
import { NavBarButton } from './Buttons/NavBarButton';
import { NavBarLink } from './Buttons/NavBarLink';
import { NotificationBadge } from './NotificationBadge';

export const NavBar = () => {
  const { dispatchShowUnderDevelopmentModal, dispatchShowCreateModal } = useModalDispatch();
  const router = useRouter();
  const me = useMe();

  const handleCreateClick = () => {
    me ? dispatchShowCreateModal(true) : router.push('/login');
  };

  return (
    <nav className="bg-black md:bg-gray-30 h-16 flex items-center inset-x-0 shadow-2xl md:w-full">
      <div className="w-full flex">
        <NavBarLink label="Home" path="/" icon={Home} activatedColor="yellow" id="top" />
        <NavBarButton
          label="Explore"
          onClick={() => dispatchShowUnderDevelopmentModal(true)}
          icon={Search}
          activatedColor="green"
        />
        <NavBarButton label="Create" icon={NewPost} onClick={handleCreateClick} />
        <NavBarLink
          label="Notifications"
          path={me ? '/notifications' : '/login'}
          icon={Bell}
          badge={me ? NotificationBadge : undefined}
          activatedColor="purple"
        />
        <NavBarLink
          label="Profile"
          icon={Profile}
          path={me ? `/profiles/${me?.profile.id}` : '/login'}
          activatedColor="purple-green"
        />
        <NavBarLink
          label="Playground"
          path="/playground"
          icon={() => <Happy width={20} height={20} />}
          activatedColor="yellow"
        />
      </div>
    </nav>
  );
};
