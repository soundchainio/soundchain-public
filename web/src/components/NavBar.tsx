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
import { Logo } from '../icons/Logo';

export const NavBar = () => {
  const { dispatchShowCreateModal } = useModalDispatch();
  const router = useRouter();
  const me = useMe();
  const { isMinting } = useHideBottomNavBar();

  const handleCreateClick = () => {
    me ? dispatchShowCreateModal(true) : router.push('/login');
  };

  return (
    <nav
      className="inset-x-0 flex h-16 items-center bg-black shadow-2xl"
    >
      <div className="w-full flex justify-center gap-6">
        <Logo className="block h-8 w-auto" />

        <NavBarButton label="Home" path="/home" icon={Home} color="yellow" id="top" />
        <NavBarButton id="top-explore-" label="Explore" path={me ? '/explore' : '/login'} icon={Search} color="green" />
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
        {!isMinting ? (
          <NavBarButton label="Minting..." alwaysShowLabel nyanCat={true} onClick={handleCreateClick} />
        ) : (
          <NavBarButton label="Create" alwaysShowLabel icon={NewPost} onClick={handleCreateClick} />
        )}
      </div>
    </nav>
  );
};
