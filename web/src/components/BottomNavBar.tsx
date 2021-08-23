import { useMe } from 'hooks/useMe';
import { Bell } from 'icons/Bell';
import { Home } from 'icons/Home';
import { NewPost } from 'icons/NewPost';
import { Profile } from 'icons/Profile';
import { Search } from 'icons/Search';
import { setJwt } from 'lib/apollo';
import { useRouter } from 'next/router';
import { useState } from 'react';
import { BottomNavBarButton } from './BottomNavBarButton';
import { NewPostModal } from './NewPostModal';

export const BottomNavBar = () => {
  const [showNewPost, setShowNewPost] = useState(false);
  const router = useRouter();
  const me = useMe();

  const handleNewPostClick = () => {
    me ? setShowNewPost(!showNewPost) : router.push('/login');
  };

  return (
    <nav className="bg-gray-20 h-16 flex items-center inset-x-0 shadow-2xl">
      <div className="w-full flex">
        <BottomNavBarButton label="Home" path="/" icon={Home} activatedTextClass="yellow" />
        <BottomNavBarButton label="Explore" path="/search" icon={Search} activatedTextClass="green" />
        <BottomNavBarButton label="Post" icon={NewPost} onClick={handleNewPostClick} />
        <BottomNavBarButton
          label="Notifications"
          path="/notifications"
          icon={Bell}
          counter
          activatedTextClass="purple"
        />
        <BottomNavBarButton label="Profile" icon={Profile} onClick={setJwt} activatedTextClass="green-purple" />
        <NewPostModal setShowNewPost={setShowNewPost} showNewPost={showNewPost} />
      </div>
    </nav>
  );
};
