import { useModalDispatch } from 'contexts/providers/modal';
import { useHideBottomNavBar } from 'hooks/useHideBottomNavBar';
import { useMe } from 'hooks/useMe';
import { Home } from 'icons/Home';
import { Library } from 'icons/Library';
import { MarketplaceNavBar } from 'icons/MarketplaceNavBar';
import { NewPost } from 'icons/NewPost';
import { Search } from 'icons/Search';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { NavBarButton } from './Buttons/NavBarButton';

export const BottomNavBar = () => {
  const { dispatchShowCreateModal } = useModalDispatch();
  const router = useRouter();
  const me = useMe();
  const { isMinting } = useHideBottomNavBar();

  const handleCreateClick = () => {
    me ? dispatchShowCreateModal(true) : router.push('/login');
  };

  useEffect(() => {
    if (process.browser) {
      window.onbeforeunload = e => {
        if (isMinting) {
          return 'You are minting an NFT. You should not leave SoundChain!';
        }
        e.preventDefault();
      };
    }
  }, [isMinting]);

  return (
    <nav
      id="bottom-nav-bar"
      className="bg-black md:hidden py-3 flex items-center inset-x-0 shadow-2xl"
    >
      <div className="w-full">
        <div className="w-full flex items-end">
          <NavBarButton label="Home" path="/home" icon={Home} color="yellow" />
          <NavBarButton
            id="nav-explore-"
            label="Explore"
            path={me ? '/explore' : '/login'}
            icon={Search}
            color="green"
          />
          {isMinting ? (
            <NavBarButton label="Minting..." nyanCat={true} onClick={handleCreateClick} />
          ) : (
            <NavBarButton label="Create" icon={NewPost} onClick={handleCreateClick} />
          )}
          <NavBarButton
            id="nav-library-"
            label="Library"
            path={me ? '/library' : '/login'}
            icon={Library}
            color="purple"
          />
          <NavBarButton
            id="nav-market-"
            label="Market"
            icon={MarketplaceNavBar}
            color="purple-green"
            path={'/marketplace'}
          />
        </div>
      </div>
    </nav>
  );
};
