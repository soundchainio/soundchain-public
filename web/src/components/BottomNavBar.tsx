import { Home } from 'icons/Home';
import { NewPost } from 'icons/NewPost';
import { Notification } from 'icons/Notification';
import { Profile } from 'icons/Profile';
import { Search } from 'icons/Search';

export const BottomNavBar = () => {
  return (
    <nav className="bg-gray-20 h-16 flex items-center">
      <div className="w-full flex justify-around">
        <Home activated />
        <Search />
        <NewPost />
        <Notification />
        <Profile />
      </div>
    </nav>
  );
};
