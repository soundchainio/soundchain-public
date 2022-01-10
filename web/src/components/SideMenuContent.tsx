import { FollowModal } from 'components/FollowersModal';
import { Number } from 'components/Number';
import { useModalDispatch } from 'contexts/providers/modal';
import { useMagicContext } from 'hooks/useMagicContext';
import { useMe } from 'hooks/useMe';
import { Feedback } from 'icons/Feedback';
import { Logo } from 'icons/Logo';
import { Logout } from 'icons/Logout';
import { Settings } from 'icons/Settings';
import { Discord } from 'icons/social/Discord';
import { FacebookSquare } from 'icons/social/FacebookSquare';
import { InstagramSquare } from 'icons/social/InstagramSquare';
import { Reddit } from 'icons/social/Reddit';
import { TwitterSquare } from 'icons/social/TwitterSquare';
import { Verified } from 'icons/Verified';
import { Wallet } from 'icons/Wallet';
import { setJwt } from 'lib/apollo';
import { Role, usePendingRequestsBadgeNumberQuery } from 'lib/graphql';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState } from 'react';
import { FollowModalType } from 'types/FollowModalType';
import { Avatar } from './Avatar';
import { DisplayName } from './DisplayName';
import { MenuItem } from './MenuItem';
import { MenuLink } from './MenuLink';

interface SideMenuContentProps {
  isMobile?: boolean;
  setOpen: (open: boolean) => void;
}

export const SideMenuContent = ({ isMobile, setOpen }: SideMenuContentProps) => {
  const { data: pendingRequestsBadgeNumber } = usePendingRequestsBadgeNumberQuery();
  const me = useMe();
  const router = useRouter();
  const { dispatchShowUnderDevelopmentModal } = useModalDispatch();
  const { magic } = useMagicContext();

  const [showModal, setShowModal] = useState(false);
  const [followModalType, setFollowModalType] = useState<FollowModalType>();

  const onLogout = async () => {
    await magic.user.logout();
    setJwt();
    router.reload();
  };

  const onPrivacyClick = () => {
    dispatchShowUnderDevelopmentModal(true);
    setOpen(false);
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
          <MenuLink icon={Feedback} label="Leave Feedback" href="/feedback" />
          {me.roles.includes(Role.Admin) ? (
            <MenuLink
              icon={Verified}
              label="Admin Panel"
              href="/manage-requests"
              badgeNumber={pendingRequestsBadgeNumber?.pendingRequestsBadgeNumber}
            />
          ) : (
            <MenuLink
              icon={Verified}
              label={me.profile.verified ? 'Verified Account' : 'Get Verified'}
              href={me.profile.verified ? '#' : '/get-verified'}
            />
          )}

          <MenuLink icon={Settings} label="Account Settings" href="/settings" />
          <MenuItem icon={Logout} label="Logout" onClick={onLogout} />
        </div>
      )}
      <div className="flex-shrink-0 flex p-4" onClick={onPrivacyClick}>
        <div className="flex flex-row space-x-2 items-center h-10 justify-between text-gray-CC px-4 w-full">
          <div className="flex">PRIVACY POLICY</div>
          <div className="flex">V0</div>
        </div>
      </div>
      <div className="flex-shrink-0 flex">
        <div className="flex flex-row space-x-2 items-center h-10 justify-between px-10 w-full">
          <Reddit />
          <TwitterSquare />
          <Discord />
          <FacebookSquare />
          <InstagramSquare />
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
  );
};
