import classNames from 'classnames'
import { BottomNavBarWrapper } from 'components/BottomNavBar/BottomNavBarWrapper'
import { RightSideNav } from 'components/RightSideNav'
import { PanelTaskbar } from 'components/PanelTaskbar'
import { useModalState } from 'contexts/ModalContext'
import { useHideBottomNavBar } from 'hooks/useHideBottomNavBar'
import { useIsMobile } from 'hooks/useIsMobile'
import { useLayoutContext } from 'hooks/useLayoutContext'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/router'
import { ReactNode, useEffect, useState } from 'react'
import { ToastContainer } from 'react-toastify'
import { breakpointsNumber } from 'utils/breakpoints'
import { Header } from './Header'
import ConfirmDeleteEditionModal from './modals/ConfirmDeleteEditionModal'
import { TagManager } from './TagManager'
import { TopNavBar, TopNavBarProps } from './TopNavBar'

const PostModal = dynamic(import('./Post/PostModal'))
const ReactionsModal = dynamic(import('./ReactionsModal'))
const CommentModal = dynamic(import('./Comment/CommentModal'))
const AuthorActionsModal = dynamic(import('./modals/AuthorActionsModal'))
const ApproveModal = dynamic(import('./modals/ApproveModal'))
const BidsHistoryModal = dynamic(import('./modals/BidsHistoryModal'))
const ConfirmDeleteNFTModal = dynamic(import('./modals/ConfirmDeleteNFTModal'))
const FilterModalMarketplace = dynamic(import('./modals/FilterMarketplaceModal'))
const RemoveListingConfirmationModal = dynamic(import('./RemoveListingConfirmationModal'))
const TransferConfirmationModal = dynamic(import('./TransferConfirmationModal'))
const TransferOgunConfirmationModal = dynamic(import('./TransferOgunConfirmationModal'))
const UnderDevelopmentModal = dynamic(import('./UnderDevelopmentModal'))
const NftTransferConfirmationModal = dynamic(import('./modals/NftTransferConfirmationModal'))
const MobileBottomAudioPlayer = dynamic(import('components/common/BottomAudioPlayer/MobileBottomAudioPlayer'))
const DesktopBottomAudioPlayer = dynamic(import('components/common/BottomAudioPlayer/DesktopBottomAudioPlayer'))
const AudioPlayerModal = dynamic(import('components/modals/AudioPlayerModal'))
const CreateModal = dynamic(import('components/modals/CreateModal'))

interface LayoutProps {
  children: ReactNode
  topNavBarProps?: TopNavBarProps
  hideBottomNavBar?: boolean
  className?: string
}

export const Layout = ({ children, className }: LayoutProps) => {
  const { setHideBottomNavBarState } = useHideBottomNavBar()
  const modalState = useModalState()
  const showCommentModal = modalState?.showCommentModal
  const { hideBottomNavBar, isAuthLayout, topNavBarProps, isLandingLayout } = useLayoutContext()
  const { asPath } = useRouter()
  const [canInsertScript, setCanInsertScript] = useState(false)

  const isMobileOrTablet = useIsMobile(breakpointsNumber.tablet)

  useEffect(() => {
    setCanInsertScript(true)
  }, [asPath])

  useEffect(() => {
    setHideBottomNavBarState(Boolean(hideBottomNavBar))
  }, [hideBottomNavBar, setHideBottomNavBarState])

  if (isAuthLayout) {
    return (
      <div className="flex h-full flex-col bg-gray-20 pb-6">
        {canInsertScript && <TagManager />}
        <TopNavBar {...topNavBarProps} />
        <div className="flex flex-1 flex-col bg-gray-20 px-6 pt-6 sm:mx-auto sm:w-full sm:max-w-lg lg:px-8">
          {children}
        </div>
      </div>
    )
  }

  if (isLandingLayout) {
    return (
      <div className="flex h-full flex-col bg-black">
        {canInsertScript && <TagManager />}
        <Header />
        <div className="flex-auto bg-black px-6 lg:px-8">{children}</div>
        <footer className="flex w-full items-center justify-center bg-rainbow-gradient py-2 text-center md:text-lg">
          2022 SoundChain, all rights reserved
        </footer>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {canInsertScript && <TagManager />}
      <div className="max-h-full flex-1 overflow-y-auto">
        <div className="flex h-full flex-1 overflow-hidden">
          <div className="flex w-0 flex-1 flex-col overflow-hidden">
            <TopNavBar {...topNavBarProps} />
            <div id="top-sheet"></div>
            <main id="main" className="relative flex-1 overflow-y-auto bg-gray-10 focus:outline-none">
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
            <TransferOgunConfirmationModal />
            <ConfirmDeleteNFTModal />
            <ConfirmDeleteEditionModal />
            <ApproveModal />
            <RemoveListingConfirmationModal />
            <FilterModalMarketplace />
            <BidsHistoryModal />
            <CreateModal />
            <AudioPlayerModal />
            <NftTransferConfirmationModal />
          </div>
        </div>
      </div>
      {isMobileOrTablet ? <MobileBottomAudioPlayer /> : <DesktopBottomAudioPlayer />}
      <BottomNavBarWrapper />
      <RightSideNav />
      <PanelTaskbar />
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
  )
}