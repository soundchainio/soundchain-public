import classNames from 'classnames';
import { BottomNavBarWrapper } from 'components/BottomNavBarWrapper';
import { useModalState } from 'contexts/providers/modal';
import { useHideBottomNavBar } from 'hooks/useHideBottomNavBar';
import { useLayoutContext } from 'hooks/useLayoutContext';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import { ReactNode, useEffect, useState } from 'react';
import { ToastContainer } from 'react-toastify';
import { Header } from './Header';
import ConfirmDeleteEditionModal from './modals/ConfirmDeleteEditionModal';
import { TopNavBar, TopNavBarProps } from './TopNavBar';

const SideMenu = dynamic(() => import('./SideMenu'));
const PostModal = dynamic(import('./PostModal'));
const ReactionsModal = dynamic(import('./ReactionsModal'));
const CommentModal = dynamic(import('./CommentModal'));
const AuthorActionsModal = dynamic(import('./AuthorActionsModal'));
const ApproveModal = dynamic(import('./modals/ApproveModal'));
const BidsHistoryModal = dynamic(import('./modals/BidsHistoryModal'));
const ConfirmDeleteNFTModal = dynamic(import('./modals/ConfirmDeleteNFTModal'));
const FilterModalMarketplace = dynamic(import('./modals/FilterMarketplaceModal'));
const RemoveListingConfirmationModal = dynamic(import('./RemoveListingConfirmationModal'));
const TransferConfirmationModal = dynamic(import('./TransferConfirmationModal'));
const UnderDevelopmentModal = dynamic(import('./UnderDevelopmentModal'));
const NftTransferConfirmationModal = dynamic(import('./modals/NftTransferConfirmationModal'));
const BottomAudioPlayer = dynamic(import('components/BottomAudioPlayer'));
const AudioPlayerModal = dynamic(import('components/modals/AudioPlayerModal'));
const CreateModal = dynamic(import('components/modals/CreateModal'));

interface LayoutProps {
  children: ReactNode;
  topNavBarProps?: TopNavBarProps;
  hideBottomNavBar?: boolean;
  className?: string;
}

export const Layout = ({ children, className }: LayoutProps) => {
  const [sideMenuOpen, setSideMenuOpen] = useState(false);
  const { setHideBottomNavBarState } = useHideBottomNavBar();
  const { showCommentModal } = useModalState();
  const { hideBottomNavBar, isAuthLayout, topNavBarProps, isLandingLayout } = useLayoutContext();
  const { asPath } = useRouter();

  useEffect(() => {
    setSideMenuOpen(false);
  }, [asPath]);

  useEffect(() => {
    setHideBottomNavBarState(Boolean(hideBottomNavBar));
  }, [hideBottomNavBar, setHideBottomNavBarState]);

  if (isAuthLayout) {
    return (
      <div className="h-full flex flex-col bg-gray-20 pb-6">
        <TopNavBar {...topNavBarProps} />
        <div className="flex flex-1 flex-col sm:mx-auto sm:w-full sm:max-w-lg bg-gray-20 px-6 lg:px-8 pt-6">
          {children}
        </div>
      </div>
    );
  }

  if (isLandingLayout) {
    return (
      <div className="flex flex-col h-full bg-black">
        <Header />
        <div className="flex-auto px-6 lg:px-8 bg-black">{children}</div>
        <footer className="bg-rainbow-gradient w-full flex justify-center items-center py-2 md:text-lg text-center">
          2022 SoundChain, all rights reserved
        </footer>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 max-h-full overflow-y-auto">
        <div className="h-full flex-1 flex overflow-hidden">
          <SideMenu isOpen={sideMenuOpen} setOpen={setSideMenuOpen} />
          <div className="flex flex-col w-0 flex-1 overflow-hidden">
            <TopNavBar setSideMenuOpen={setSideMenuOpen} {...topNavBarProps} />
            <div id="top-sheet"></div>
            <main id="main" className="flex-1 relative overflow-y-auto focus:outline-none bg-gray-10">
              <div className={classNames('h-full', className)}>{children}</div>
            </main>
          </div>
          <div id="modals" className="absolute z-20 w-full">
            <UnderDevelopmentModal />
            <PostModal />
            {showCommentModal && <CommentModal />}
            <AuthorActionsModal />
            <ReactionsModal />
            <TransferConfirmationModal />
            <ConfirmDeleteNFTModal />
            <ConfirmDeleteEditionModal />
            <ApproveModal />
            <RemoveListingConfirmationModal />
            <FilterModalMarketplace />
            <BidsHistoryModal />
            <CreateModal />
            <AudioPlayerModal />
            <NftTransferConfirmationModal/>
          </div>
        </div>
      </div>
      <BottomAudioPlayer />
      <BottomNavBarWrapper />
      <ToastContainer
        position="top-center"
        autoClose={6 * 1000}
        toastStyle={{
          backgroundColor: '#202020',
          color: 'white',
          fontSize: '12x',
          textAlign: 'center',
        }}
      />
    </div>
  );
};