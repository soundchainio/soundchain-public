import { FollowModal } from 'components/FollowersModal';
import { Number } from 'components/Number';
import { useMagicContext } from 'hooks/useMagicContext';
import { useMe } from 'hooks/useMe';
import { Document } from 'icons/Document';
import { Feedback } from 'icons/Feedback';
import { Logo } from 'icons/Logo';
import { Logout } from 'icons/Logout';
import { Settings } from 'icons/Settings';
import { Discord } from 'icons/social/Discord';
import { InstagramSquare } from 'icons/social/InstagramSquare';
import { TwitterSquare } from 'icons/social/TwitterSquare';
import { Verified } from 'icons/Verified';
import { Wallet } from 'icons/Wallet';
import { setJwt } from 'lib/apollo';
import { Role, usePendingRequestsBadgeNumberQuery } from 'lib/graphql';
import { default as Link, default as NextLink } from 'next/link';
import { useRouter } from 'next/router';
import { useState } from 'react';
import { FollowModalType } from 'types/FollowModalType';
import { Avatar } from './Avatar';
import { DisplayName } from './DisplayName';
import { MenuItem } from './MenuItem';
import { MenuLink } from './MenuLink';
import { SocialTag } from './SocialTag';

interface SideMenuContentProps {
  isMobile?: boolean;
}

export const SideMenuContent = ({ isMobile }: SideMenuContentProps) => {
  const { data: pendingRequestsBadgeNumber } = usePendingRequestsBadgeNumberQuery();
  const me = useMe();
  const router = useRouter();
  const { magic } = useMagicContext();

  const [showModal, setShowModal] = useState(false);
  const [followModalType, setFollowModalType] = useState<FollowModalType>();

  const onLogout = async () => {
    await magic.user.logout();
    setJwt();
    router.reload();
  };

  const onFollowers = () => {
    setFollowModalType(FollowModalType.FOLLOWERS);
    setShowModal(true);
  };

  const onFollowing = () => {
    setFollowModalType(FollowModalType.FOLLOWING);
    setShowModal(true);
  };

  const onCloseModal = () => {
    setShowModal(false);
  };

  return (
    <>
      <div className="mt-5 flex-1 h-0 overflow-y-auto">
        <div className="px-4">
          <div className="flex justify-center">
            <Link href="/" passHref>
              <a aria-label="Home">
                <Logo id={isMobile ? 'mobile-logo' : 'side-logo'} className="h-[50px]" />
              </a>
            </Link>
          </div>
          {me && (
            <>
              <div className="flex flex-row mt-6 relative">
                <Avatar profile={me.profile} pixels={60} className="h-[68px] border-gray-10 border-4 rounded-full" />
                <div className="px-2 flex flex-grow space-x-4 justify-center items-center">
                  <button className="text-center text-lg" onClick={onFollowers}>
                    <p className="font-semibold text-white">
                      <Number value={me.profile.followerCount} />
                    </p>
                    <p className="text-gray-80 text-xs">Followers</p>
                  </button>
                  <button className="text-center text-lg" onClick={onFollowing}>
                    <p className="font-semibold text-white">
                      <Number value={me.profile.followingCount} />
                    </p>
                    <p className="text-gray-80 text-xs">Following</p>
                  </button>
                </div>
              </div>
              <div className="flex flex-col mt-4">
                <DisplayName
                  name={me.profile.displayName}
                  verified={me.profile.verified}
                  teamMember={me.profile.teamMember}
                />
                <p className="text-gray-80 text-md">@{me.handle}</p>
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
      <div className="flex-shrink-0 flex items-center justify-between h-10 my-4 mx-8 text-gray-CC">
        <NextLink href="/privacy-policy">
          <a>PRIVACY POLICY</a>
        </NextLink>
        <span>V0</span>
      </div>
      <div className="flex-shrink-0 flex flex-row justify-between items-center h-10 mx-8">
        <SocialTag
          ariaLabel="SoundChain Twitter account"
          url="https://twitter.com/Soundchain_io"
          icon={TwitterSquare}
        />
        <SocialTag ariaLabel="SoundChain Discord account" url="https://discord.gg/C8wKknym" icon={Discord} />
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
  );
};
