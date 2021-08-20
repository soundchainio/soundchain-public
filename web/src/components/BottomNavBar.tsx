import { useMe } from 'hooks/useMe';
import { Home } from 'icons/Home';
import { NewPost } from 'icons/NewPost';
import { Bell } from 'icons/Bell';
import { Profile } from 'icons/Profile';
import { Search } from 'icons/Search';
import { setJwt } from 'lib/apollo';
import { useRouter } from 'next/router';
import { useState } from 'react';
import { NewPostModal } from './NewPostModal';
import { NotificationCounter } from './NotificationCounter';

export const BottomNavBar = () => {
  const [showNewPost, setShowNewPost] = useState(false);
  const router = useRouter();
  const me = useMe();

  const handleNewPostClick = () => {
    me ? setShowNewPost(!showNewPost) : router.push('/login');
  };

  return (
    <nav className="bg-gray-20 h-16 flex items-center inset-x-0 shadow-2xl">
      <div className="w-full flex justify-around">
        <Home activated onClick={() => router.push('/')} />
        <Search />
        <NewPost onClick={handleNewPostClick} />
        <div className="relative">
          <NotificationCounter />
          <Bell onClick={() => router.push('/notifications')} />
        </div>
        <Profile onClick={() => setJwt()} />
        <NewPostModal setShowNewPost={setShowNewPost} showNewPost={showNewPost} />
      </div>
    </nav>
  );
};
