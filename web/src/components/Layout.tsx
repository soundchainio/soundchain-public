import classNames from 'classnames'
import { BottomNavBarWrapper } from 'components/BottomNavBar/BottomNavBarWrapper'
// RightSideNav removed — vertical Discord pills were cluttering mobile
import { PanelTaskbar } from 'components/PanelTaskbar'
import { useModalState } from 'contexts/ModalContext'
import { useHideBottomNavBar } from 'hooks/useHideBottomNavBar'
import { useIsMobile } from 'hooks/useIsMobile'
import { useLayoutContext } from 'hooks/useLayoutContext'
import { useAudioPlayerContext } from 'hooks/useAudioPlayer'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/router'
import { ReactNode, useEffect, useState } from 'react'
import { ToastContainer, Slide } from 'react-toastify'
import { breakpointsNumber } from 'utils/breakpoints'
import { Header } from './Header'
import ConfirmDeleteEditionModal from './modals/ConfirmDeleteEditionModal'
import { TagManager } from './TagManager'
import { DexNavBar } from './DexNavBar'
import { TopNavBar, TopNavBarProps } from './TopNavBar'

// Decentralized notification components (no SMS/Twilio - pure web!)
const PWAInstallPrompt = dynamic(() => import('components/dex/PWAInstallPrompt'), { ssr: false })
const NostrNotificationListener = dynamic(() => import('components/dex/NostrNotificationListener'), { ssr: false })
const PulseGatewayListener = dynamic(() => import('components/pulse/PulseGatewayListener'), { ssr: false })

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
const AudioEngine = dynamic(import('components/common/BottomAudioPlayer/AudioEngine'))
const AudioPlayerModal = dynamic(import('components/modals/AudioPlayerModal'))
const CreateModal = dynamic(import('components/modals/CreateModal'))
const MiniRadioBar = dynamic(() => import('components/MiniRadioBar').then(mod => mod.MiniRadioBar), { ssr: false })
const NeuralModal = dynamic(() => import('components/NeuralModal').then(mod => ({ default: mod.NeuralModal })), { ssr: false })
const OperatorModal = dynamic(() => import('components/OperatorModal').then(mod => ({ default: mod.OperatorModal })), { ssr: false })

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
  const { currentSong } = useAudioPlayerContext()
  const { asPath } = useRouter()
  const [canInsertScript, setCanInsertScript] = useState(false)

  const isMobileOrTablet = useIsMobile(breakpointsNumber.tablet)
  const hasActivePlayer = !!currentSong?.src
  const [neuralOpen, setNeuralOpen] = useState(false)
  const [operatorOpen, setOperatorOpen] = useState(false)

  // Listen for global toggle events (from TopNavBar buttons)
  useEffect(() => {
    const neuralHandler = () => setNeuralOpen(prev => !prev)
    const operatorHandler = () => setOperatorOpen(prev => !prev)
    window.addEventListener('toggle-neural', neuralHandler)
    window.addEventListener('toggle-operator', operatorHandler)
    return () => {
      window.removeEventListener('toggle-neural', neuralHandler)
      window.removeEventListener('toggle-operator', operatorHandler)
    }
  }, [])

  useEffect(() => {
    setCanInsertScript(true)
  }, [asPath])

  useEffect(() => {
    setHideBottomNavBarState(Boolean(hideBottomNavBar))
  }, [hideBottomNavBar, setHideBottomNavBarState])

  if (isAuthLayout) {
    return (
      <div className="flex min-h-screen flex-col bg-black">
        {canInsertScript && <TagManager />}
        <div className="flex flex-1 flex-col bg-black px-4 pt-4 pb-safe sm:mx-auto sm:w-full sm:max-w-lg lg:px-8">
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
            <MiniRadioBar />
            <DexNavBar />
            <div id="top-sheet"></div>
            <main id="main" className="relative flex-1 overflow-y-auto bg-gray-10 focus:outline-none">
              <div className={classNames('h-full pb-24', className)}>{children}</div>
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
      <AudioEngine />
      {isMobileOrTablet ? <MobileBottomAudioPlayer /> : <DesktopBottomAudioPlayer />}
      <BottomNavBarWrapper />
      {/* RightSideNav removed */}
      <PanelTaskbar />
      <ToastContainer
        position="top-center"
        autoClose={6 * 1000}
        toastStyle={{
          backgroundColor: '#202020',
          color: 'white',
          fontSize: '12px',
          textAlign: 'center',
        }}
      />
      {/* Desktop DM toast — slides in from right, Pulse branded */}
      <ToastContainer
        containerId="pulse-desktop"
        position="top-right"
        autoClose={8000}
        transition={Slide}
        newestOnTop
        closeOnClick
        hideProgressBar
        style={{ top: '12px', right: '12px' }}
        toastStyle={{
          backgroundColor: '#111b21',
          color: '#e9edef',
          borderLeft: '3px solid #00a884',
          borderRadius: '10px',
          padding: '12px 16px',
          minWidth: '320px',
          maxWidth: '400px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          cursor: 'pointer',
        }}
      />
      {/* Neural brain scanner — global floating modal */}
      {hasActivePlayer && <NeuralModal isOpen={neuralOpen} onClose={() => setNeuralOpen(false)} />}
      <OperatorModal isOpen={operatorOpen} onClose={() => setOperatorOpen(false)} />
      {/* Decentralized notification stack - no SMS/Twilio! */}
      <PWAInstallPrompt />
      <NostrNotificationListener />
      <PulseGatewayListener />
    </div>
  )
}