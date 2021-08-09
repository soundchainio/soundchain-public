import { Home } from 'icons/Home';
import { NewPost } from 'icons/NewPost';
import { Notification } from 'icons/Notification';
import { Profile } from 'icons/Profile';
import { Search } from 'icons/Search';
import { setJwt } from 'lib/apollo';
import { useRouter } from 'next/dist/client/router';

export const BottomNavBar = () => {
  const router = useRouter();
  return (
    <nav className="bg-gray-20 h-16 flex items-center fixed bottom-0 inset-x-0 shadow-2xl">
      <div className="w-full flex justify-around">
        <Home activated />
        <Search />
        <NewPost onClick={() => router.push('/posts')} />
        <Notification />
        <Profile onClick={() => setJwt()} />
      </div>
    </nav>
  );
};
