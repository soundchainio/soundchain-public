import { useState } from 'react'

import { Avatar } from 'components/Avatar'
import { FollowModal } from 'components/FollowersModal'
import { Number } from 'components/Number'
import { config } from 'config'
import { useHideBottomNavBar } from 'hooks/useHideBottomNavBar'
import { useMagicContext } from 'hooks/useMagicContext'
import { useMe } from 'hooks/useMe'
import { Code } from 'icons/Code'
import { Document } from 'icons/Document'
import { Feedback } from 'icons/Feedback'
import { Logout } from 'icons/Logout'
import { Settings } from 'icons/Settings'
import { Discord } from 'icons/social/Discord'
import { InstagramSquare } from 'icons/social/InstagramSquare'
import { TwitterSquare } from 'icons/social/TwitterSquare'
import { Verified } from 'icons/Verified'
import { Wallet } from 'icons/Wallet'
import { Logo } from 'icons/Logo'
import { setJwt } from 'lib/apollo'
import { Role, usePendingRequestsBadgeNumberQuery } from 'lib/graphql'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { toast } from 'react-toastify'
import { FollowModalType } from 'types/FollowModalType'
import { Wallet as WalletIcon, FileText, MessageSquare, Terminal, Shield, User, LogOut, ChevronRight, ExternalLink } from 'lucide-react'

import { InboxButton } from './common/Buttons/InboxButton'
import { DisplayName } from './DisplayName'
import { MenuItem } from './MenuItem'
import { MenuLink } from './MenuLink'
import { SocialTag } from './SocialTag'

interface SideMenuContentProps {
  isMobile?: boolean
}

export const SideMenuContent = ({}: SideMenuContentProps) => {
  const { data: pendingRequestsBadgeNumber } = usePendingRequestsBadgeNumberQuery()
  const me = useMe()
  const router = useRouter()
  const { magic } = useMagicContext()
  const { isMinting } = useHideBottomNavBar()

  const [showModal, setShowModal] = useState(false)
  const [followModalType, setFollowModalType] = useState<FollowModalType>()

  const onLogout = async () => {
    if (isMinting) {
      toast.error(`You can't logout while minting an NFT.`)
      return false
    }

    try {
      // Clear Magic session first
      if (magic && magic.user) {
        await magic.user.logout()
      }

      // Clear all auth tokens from localStorage
      localStorage.removeItem('didToken')
      localStorage.removeItem('jwt_fallback')
      localStorage.removeItem('connectedWalletAddress')
      localStorage.removeItem('connectedWalletType')

      // Clear JWT cookie and Apollo cache
      await setJwt()

      // Force full page reload to clear all state
      window.location.href = '/login'
    } catch (error) {
      console.error('Logout error:', error)
      // Force reload even on error to ensure user is logged out
      window.location.href = '/login'
    }
  }

  const onFollowers = () => {
    setFollowModalType(FollowModalType.FOLLOWERS)
    setShowModal(true)
  }

  const onFollowing = () => {
    setFollowModalType(FollowModalType.FOLLOWING)
    setShowModal(true)
  }

  const onCloseModal = () => {
    setShowModal(false)
  }

  const { polBalance, ogunBalance } = useMagicContext()

  const formatBalance = (bal: number | string | undefined) => {
    const num = Number(bal) || 0
    if (num < 0.001) return '0'
    if (num < 1) return num.toFixed(4)
    if (num < 1000) return num.toFixed(2)
    return `${(num / 1000).toFixed(1)}K`
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto">
        {me && (
          <>
            {/* Profile Header - Modern Style */}
            <div className="p-6 border-b border-white/5">
              <div className="flex items-center gap-4">
                <Avatar profile={me.profile} pixels={56} className="rounded-full ring-2 ring-white/10" />
                <div className="flex-1 min-w-0">
                  <DisplayName
                    name={me.profile.displayName}
                    verified={me.profile.verified}
                    teamMember={me.profile.teamMember}
                    badges={me.profile.badges}
                  />
                  <p className="text-sm text-gray-400 truncate">@{me.handle}</p>
                </div>
              </div>

              {/* Stats Row */}
              <div className="flex items-center gap-6 mt-4">
                <button className="group" onClick={onFollowers}>
                  <span className="block text-lg font-semibold text-white group-hover:text-cyan-400 transition-colors">
                    <Number value={me.profile.followerCount} />
                  </span>
                  <span className="text-xs text-gray-500">Followers</span>
                </button>
                <button className="group" onClick={onFollowing}>
                  <span className="block text-lg font-semibold text-white group-hover:text-cyan-400 transition-colors">
                    <Number value={me.profile.followingCount} />
                  </span>
                  <span className="text-xs text-gray-500">Following</span>
                </button>
              </div>
            </div>

            {/* Quick Wallet Overview */}
            <div className="px-6 py-4 border-b border-white/5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-gray-400 font-medium">BALANCE</span>
                <Link href="/wallet" passHref>
                  <span className="text-xs text-cyan-400 hover:text-cyan-300 cursor-pointer flex items-center gap-1">
                    View All <ChevronRight className="w-3 h-3" />
                  </span>
                </Link>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🟣</span>
                    <span className="text-white font-medium">{formatBalance(polBalance)} POL</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Logo className="w-4 h-4" />
                    <span className="text-cyan-400 font-medium">{formatBalance(ogunBalance)} OGUN</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="px-6 py-3 border-b border-white/5">
              <InboxButton showLabel />
            </div>

            {/* Menu Links - Cleaner */}
            <div className="py-2">
              <MenuLink icon={Wallet} label="Wallet" href="/wallet" />
              <MenuLink
                icon={Document}
                label="Docs"
                target="_blank"
                rel="noreferrer"
                href="https://soundchain-1.gitbook.io/soundchain-docs/"
              />
              <MenuLink icon={Feedback} label="Feedback" href="/feedback" />
              <MenuLink icon={Code} label="Developers" href="/developers" />
              {me.roles.includes(Role.Admin) ? (
                <MenuLink
                  icon={Verified}
                  label="Admin Panel"
                  href="/manage-requests"
                  badgeNumber={pendingRequestsBadgeNumber?.pendingRequestsBadgeNumber}
                />
              ) : (
                !me.profile.verified && <MenuLink icon={Verified} label="Get Verified" href="/get-verified" />
              )}
              <MenuLink icon={Settings} label="Settings" href="/settings" />
            </div>

            {/* Logout - Separate Section */}
            <div className="px-6 py-3 border-t border-white/5">
              <button
                onClick={onLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm font-medium">Sign Out</span>
              </button>
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-white/5">
        {/* Social Links */}
        <div className="flex items-center justify-center gap-4 mb-3">
          <SocialTag
            ariaLabel="SoundChain Twitter"
            url="https://twitter.com/Soundchain_io"
            icon={TwitterSquare}
          />
          <SocialTag ariaLabel="SoundChain Discord" url="https://discord.gg/5yZG6BTTHV" icon={Discord} />
          <SocialTag
            ariaLabel="SoundChain Instagram"
            url="https://www.instagram.com/soundchain.io/"
            icon={InstagramSquare}
          />
        </div>
        {/* Version & Legal */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <Link href="/privacy-policy" className="hover:text-gray-400 transition-colors">
            Privacy Policy
          </Link>
          <span>v{config.appVersion}</span>
        </div>
      </div>

      {me && (
        <FollowModal
          show={showModal}
          profileId={me.profile.id}
          modalType={followModalType as FollowModalType}
          onClose={onCloseModal}
        />
      )}
    </>
  )
}
