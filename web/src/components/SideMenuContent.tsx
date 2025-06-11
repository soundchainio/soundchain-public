import { useState } from 'react'

import { Avatar } from 'components/Avatar'
import { FollowModal } from 'components/FollowersModal'
import { Number } from 'components/Number'
import { config } from 'config'
import { useHideBottomNavBar } from 'hooks/useHideBottomNavBar'
import { useMagicContext } from 'hooks/useMagicContext'
import { useMe } from 'hooks/useMe'
import { Document } from 'icons/Document'
import { Feedback } from 'icons/Feedback'
import { Logout } from 'icons/Logout'
import { Settings } from 'icons/Settings'
import { Discord } from 'icons/social/Discord'
import { InstagramSquare } from 'icons/social/InstagramSquare'
import { TwitterSquare } from 'icons/social/TwitterSquare'
import { Verified } from 'icons/Verified'
import { Wallet } from 'icons/Wallet'
import { setJwt } from 'lib/apollo'
import { Role, usePendingRequestsBadgeNumberQuery } from 'lib/graphql'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { toast } from 'react-toastify'
import { FollowModalType } from 'types/FollowModalType'

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

    if (magic && magic.user) {
      await magic.user.logout()
    }
    setJwt()
    router.reload()
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

  return (
    <>
      <div className="h-0 flex-1 overflow-y-auto">
        <div className="px-6">
          {me && (
            <>
              <div className="relative mt-6 flex flex-row">
                <Avatar profile={me.profile} pixels={60} className="h-[68px] rounded-full border-4 border-gray-10" />
                <div className="flex flex-grow items-center justify-center space-x-4 px-2">
                  <button className="text-center text-lg" onClick={onFollowers}>
                    <p className="font-semibold text-white">
                      <Number value={me.profile.followerCount} />
                    </p>
                    <p className="text-xs text-gray-80">Followers</p>
                  </button>
                  <button className="text-center text-lg" onClick={onFollowing}>
                    <p className="font-semibold text-white">
                      <Number value={me.profile.followingCount} />
                    </p>
                    <p className="text-xs text-gray-80">Following</p>
                  </button>
                </div>
              </div>
              <div className="mt-4 flex flex-col">
                <DisplayName
                  name={me.profile.displayName}
                  verified={me.profile.verified}
                  teamMember={me.profile.teamMember}
                  badges={me.profile.badges}
                />
                <p className="text-md text-gray-80">@{me.handle}</p>

                <div className="py-4">
                  <InboxButton showLabel />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      {me && (
        <div>
          <MenuLink icon={Wallet} label="Wallet" href="/wallet" />
          <MenuLink
            icon={Document}
            label="Docs"
            target="_blank"
            rel="noreferrer"
            href="https://soundchain.gitbook.io/soundchain/"
          />
          <MenuLink icon={Feedback} label="Leave Feedback" href="/feedback" />
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

          <MenuLink icon={Settings} label="Account Settings" href="/settings" />
          <MenuItem icon={Logout} label="Logout" onClick={onLogout} />
        </div>
      )}
      <div className="my-4 mx-8 flex h-10 flex-shrink-0 items-center justify-between text-gray-CC">
        <Link href="/privacy-policy">PRIVACY POLICY</Link>
        <span>v {config.appVersion}</span>
      </div>
      <div className="mx-8 flex h-10 flex-shrink-0 flex-row items-center justify-between">
        <SocialTag
          ariaLabel="SoundChain Twitter account"
          url="https://twitter.com/Soundchain_io"
          icon={TwitterSquare}
        />
        <SocialTag ariaLabel="SoundChain Discord account" url="https://discord.gg/maCHnxbbSz" icon={Discord} />
        <SocialTag
          ariaLabel="SoundChain Instagram account"
          url="https://www.instagram.com/soundchain.io/"
          icon={InstagramSquare}
        />
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
