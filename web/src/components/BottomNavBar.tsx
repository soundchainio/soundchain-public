import { useModalDispatch } from 'contexts/providers/modal';
import { useMe } from 'hooks/useMe';
import { Bell } from 'icons/Bell';
import { Home } from 'icons/Home';
import { NewPost } from 'icons/NewPost';
import { Profile } from 'icons/Profile';
import { Search } from 'icons/Search';
import { useRouter } from 'next/router';
import { BottomNavBarButton } from './BottomNavBarButton';
import { NotificationBadge } from './NotificationBadge';

export const BottomNavBar = () => {
  const { dispatchSetRepostId, dispatchShowNewPostModal, dispatchShowUnderDevelopmentModal } = useModalDispatch();
  const router = useRouter();
  const me = useMe();

  const handleNewPostClick = () => {
    dispatchSetRepostId(undefined);
    me ? dispatchShowNewPostModal(true) : router.push('/login');
  };

  return (
    <nav className="bg-black md:bg-gray-30 h-16 flex items-center inset-x-0 shadow-2xl md:w-full">
      <div className="w-full flex">
        <BottomNavBarButton label="Home" path="/" icon={Home} activatedColor="yellow" />
        <BottomNavBarButton
          label="Explore"
          onClick={() => dispatchShowUnderDevelopmentModal(true)}
          icon={Search}
          activatedColor="green"
        />
        <BottomNavBarButton label="Post" icon={NewPost} onClick={handleNewPostClick} />
        <BottomNavBarButton
          label="Notifications"
          path={me ? '/notifications' : '/login'}
          icon={Bell}
          badge={me ? NotificationBadge : undefined}
          activatedColor="purple"
        />
        <BottomNavBarButton
          label="Profile"
          icon={Profile}
          path={me ? `/profiles/${me?.profile.id}` : '/login'}
          activatedColor="purple-green"
        />
      </div>
    </nav>
  );
};
