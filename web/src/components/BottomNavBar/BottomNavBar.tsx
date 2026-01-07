import { useModalDispatch } from 'contexts/ModalContext'
import { useHideBottomNavBar } from 'hooks/useHideBottomNavBar'
import { useMe } from 'hooks/useMe'
import { Home } from 'icons/Home'
import { Inbox } from 'icons/Inbox'
import { Library } from 'icons/Library'
import { MarketplaceNavBar } from 'icons/MarketplaceNavBar'
import { Search } from 'icons/Search'
import { Backend } from 'icons/Backend'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { NavBarButton } from 'components/common/Buttons/NavBarButton'
import { InboxBadge } from 'components/InboxBadge'
import { PiggyBank, X } from 'lucide-react'

export const BottomNavBar = () => {
  const { dispatchShowCreateModal } = useModalDispatch()
  const router = useRouter()
  const me = useMe()
  const { isMinting } = useHideBottomNavBar()
  const [showWinWinModal, setShowWinWinModal] = useState(false)

  const handleCreateClick = () => {
    me ? dispatchShowCreateModal(true) : router.push('/login')
  }

  useEffect(() => {
    if (process.browser) {
      window.onbeforeunload = e => {
        if (isMinting) {
          return 'You are minting an NFT. You should not leave SoundChain!'
        }
        e.preventDefault()
      }
    }
  }, [isMinting])

  const InboxBadgeWrapper = () => {
    return <InboxBadge showUnreadCount={false} />
  }

  // PiggyBank Icon component for NavBarButton
  const PiggyBankIcon = ({ className }: { className?: string }) => (
    <PiggyBank className={className || "w-6 h-6"} />
  )

  return (
    <>
      <nav id="bottom-nav-bar" className="inset-x-0 flex items-center bg-black py-3 shadow-2xl md:hidden">
        <div className="w-full">
          <div className="flex w-full items-end">
            <NavBarButton label="" path="/dex" icon={Home} color="yellow" alwaysShowLabel />
            <NavBarButton
              id="nav-explore-"
              label=""
              path={me ? '/explore' : '/login'}
              icon={Search}
              color="green"
              alwaysShowLabel
            />
            {/* WIN-WIN PiggyBank Button - Opens Streaming Rewards Modal */}
            <NavBarButton
              label=""
              icon={PiggyBankIcon}
              onClick={() => setShowWinWinModal(true)}
              color="pink-blue"
              alwaysShowLabel
            />
            <NavBarButton
              id="nav-library-"
              label=""
              path={me ? '/library' : '/login'}
              icon={Library}
              color="purple"
              alwaysShowLabel
            />
            <NavBarButton
              id="nav-market-"
              label=""
              icon={MarketplaceNavBar}
              color="purple-green"
              path={'/marketplace'}
              alwaysShowLabel
            />
            <NavBarButton
              id="nav-market-"
              label=""
              icon={Inbox}
              color="purple-green"
              path={me ? '/messages' : '/login'}
              badge={me ? InboxBadgeWrapper : undefined}
              alwaysShowLabel
            />
            <NavBarButton
              id="nav-backend-"
              label=""
              icon={Backend}
              color="cyan"
              path={'/backend'}
              alwaysShowLabel
            />
          </div>
        </div>
      </nav>

      {/* WIN-WIN Streaming Rewards Modal */}
      {showWinWinModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/95" onClick={() => setShowWinWinModal(false)} />
          <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border-2 border-pink-500 bg-gradient-to-br from-neutral-900 via-pink-900/20 to-neutral-900 shadow-[0_0_30px_rgba(236,72,153,0.3)]">
            {/* Header */}
            <div className="bg-gradient-to-r from-pink-900 to-purple-900 px-4 py-3 flex items-center justify-between border-b border-pink-500">
              <div className="flex items-center gap-2">
                <PiggyBank className="w-6 h-6 text-pink-400" />
                <div>
                  <span className="font-bold text-pink-100 text-lg">WIN-WIN Rewards</span>
                  <p className="text-xs text-pink-200/60">Stream to Earn OGUN</p>
                </div>
              </div>
              <button
                onClick={() => setShowWinWinModal(false)}
                className="w-8 h-8 flex items-center justify-center text-pink-300 hover:text-white hover:bg-pink-500/20 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {/* Tagline */}
              <div className="text-center p-4 bg-gradient-to-r from-pink-500/20 to-purple-500/20 rounded-xl border border-pink-500/30">
                <span className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400">
                  Everyone Wins When You Stream!
                </span>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-neutral-800/50 rounded-xl p-4 border border-pink-500/20">
                  <div className="text-2xl font-bold text-green-400">0.5</div>
                  <div className="text-xs text-gray-400">OGUN per NFT stream</div>
                </div>
                <div className="bg-neutral-800/50 rounded-xl p-4 border border-pink-500/20">
                  <div className="text-2xl font-bold text-yellow-400">0.05</div>
                  <div className="text-xs text-gray-400">OGUN per regular stream</div>
                </div>
                <div className="bg-neutral-800/50 rounded-xl p-4 border border-purple-500/20">
                  <div className="text-2xl font-bold text-purple-400">70%</div>
                  <div className="text-xs text-gray-400">Creator share</div>
                </div>
                <div className="bg-neutral-800/50 rounded-xl p-4 border border-cyan-500/20">
                  <div className="text-2xl font-bold text-cyan-400">30%</div>
                  <div className="text-xs text-gray-400">Listener share</div>
                </div>
              </div>

              {/* How it works */}
              <div className="space-y-2 text-sm">
                <h3 className="font-semibold text-white">How it works:</h3>
                <div className="flex items-start gap-2 text-gray-300">
                  <span className="text-pink-400">1.</span>
                  <span>Stream any track for 30+ seconds</span>
                </div>
                <div className="flex items-start gap-2 text-gray-300">
                  <span className="text-pink-400">2.</span>
                  <span>Both creator and listener earn OGUN tokens</span>
                </div>
                <div className="flex items-start gap-2 text-gray-300">
                  <span className="text-pink-400">3.</span>
                  <span>NFT tracks earn 10x more rewards!</span>
                </div>
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-pink-500/30 text-center">
                <span className="text-xs text-gray-500">
                  SOUNDCHAIN WIN-WIN | POLYGON MAINNET
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
