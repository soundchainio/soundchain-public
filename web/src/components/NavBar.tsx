import { useModalDispatch } from 'contexts/providers/modal';
import { useHideBottomNavBar } from 'hooks/useHideBottomNavBar';
import { useMe } from 'hooks/useMe';
import { Home } from 'icons/Home';
import { Library } from 'icons/Library';
import { MarketplaceNavBar } from 'icons/MarketplaceNavBar';
import { NewPost } from 'icons/NewPost';
import { Search } from 'icons/Search';
import { useRouter } from 'next/router';
import React from 'react';
import { NavBarButton } from './Buttons/NavBarButton';

export const NavBar = () => {
  const { dispatchShowCreateModal } = useModalDispatch();
  const router = useRouter();
  const me = useMe();
  const { isMinting } = useHideBottomNavBar();

  const handleCreateClick = () => {
    me ? dispatchShowCreateModal(true) : router.push('/login');
  };

  return (
    <nav className="bg-black md:bg-gray-30 h-16 flex items-center inset-x-0 shadow-2xl md:w-full">
      <div className="w-full flex justify-center gap-14">
        <NavBarButton label="Home" path="/" icon={Home} color="yellow" id="top" />
        <NavBarButton id="top-explore-" label="Explore" path={me ? '/explore' : '/login'} icon={Search} color="green" />
        {isMinting ? (
          <NavBarButton label="Minting..." nyanCat={true} onClick={handleCreateClick} />
        ) : (
          <NavBarButton label="Create" icon={NewPost} onClick={handleCreateClick} />
        )}
        <NavBarButton
          id="top-library-"
          label="Library"
          path={me ? '/library' : '/login'}
          icon={Library}
          color="purple"
        />
        <NavBarButton
          id="top-marketplace-"
          label="Market"
          icon={MarketplaceNavBar}
          color="purple-green"
          path={'/marketplace'}
        />
      </div>
    </nav>
  );
};
