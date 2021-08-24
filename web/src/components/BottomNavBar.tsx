import { useNewPostModalContext } from 'contexts/NewPostModal';
import { useMe } from 'hooks/useMe';
import { Home } from 'icons/Home';
import { NewPost } from 'icons/NewPost';
import { Notification } from 'icons/Notification';
import { Profile } from 'icons/Profile';
import { Search } from 'icons/Search';
import { setJwt } from 'lib/apollo';
import { useRouter } from 'next/router';
import { NewPostModal } from './NewPostModal';

export const BottomNavBar = () => {
  const { showNewPost, setShowNewPost, setRepostId } = useNewPostModalContext();
  const router = useRouter();
  const me = useMe();

  const handleNewPostClick = () => {
    setRepostId('');
    me ? setShowNewPost(!showNewPost) : router.push('/login');
  };

  return (
    <nav className="bg-gray-20 h-16 flex items-center inset-x-0 shadow-2xl">
      <div className="w-full flex justify-around">
        <Home activated />
        <Search />
        <NewPost onClick={handleNewPostClick} />
        <Notification />
        <Profile onClick={() => setJwt()} />
        <NewPostModal />
      </div>
    </nav>
  );
};
