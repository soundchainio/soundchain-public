import { useModalDispatch } from 'contexts/providers/modal';
import { useHideBottomNavBar } from 'hooks/useHideBottomNavBar';
import { useMe } from 'hooks/useMe';
import { Bell } from 'icons/Bell';
import { Home } from 'icons/Home';
import { NewPost } from 'icons/NewPost';
import { Profile } from 'icons/Profile';
import { Search } from 'icons/Search';
import { useRouter } from 'next/router';
import { NavBarButton } from './Buttons/NavBarButton';
import { NotificationBadge } from './NotificationBadge';

export const BottomNavBar = () => {
  const { dispatchShowCreateModal, dispatchShowUnderDevelopmentModal } = useModalDispatch();
  const router = useRouter();
  const me = useMe();
  const { isMinting } = useHideBottomNavBar();

  const handleCreateClick = () => {
    me ? dispatchShowCreateModal(true) : router.push('/login');
  };

  return (
    <nav className="bg-black md:bg-gray-30 h-16 flex items-center inset-x-0 shadow-2xl md:w-full">
      <div className="w-full flex">
        <NavBarButton label="Home" path="/" icon={Home} color="yellow" />
        <NavBarButton
          label="Explore"
          onClick={() => dispatchShowUnderDevelopmentModal(true)}
          icon={Search}
          color="green"
        />
        {isMinting ?
          <NavBarButton label="Minting..." nyanCat={true} onClick={handleCreateClick} />
          :
          <NavBarButton label="Create" icon={NewPost} onClick={handleCreateClick} />
        }
        <NavBarButton
          label="Notifications"
          path={me ? '/notifications' : '/login'}
          icon={Bell}
          badge={me ? NotificationBadge : undefined}
          color="purple"
        />
        <NavBarButton
          label="Profile"
          icon={Profile}
          path={me ? `/profiles/${me?.profile.id}` : '/login'}
          color="green-blue"
        />
      </div>
    </nav>
  );
};
