import { Number } from 'components/Number';
import { useMe } from 'hooks/useMe';
import { Logo } from 'icons/Logo';
import { Logout } from 'icons/Logout';
import { Settings } from 'icons/Settings';
import { Discord } from 'icons/social/Discord';
import { FacebookSquare } from 'icons/social/FacebookSquare';
import { InstagramSquare } from 'icons/social/InstagramSquare';
import { Reddit } from 'icons/social/Reddit';
import { TwitterSquare } from 'icons/social/TwitterSquare';
import { setJwt } from 'lib/apollo';
import { useRouter } from 'next/router';
import { Avatar } from './Avatar';
import { MenuItem } from './MenuItem';
import { Title } from './Title';
import NextLink from 'next/link';

interface SideMenuContentProps {
  isMobile?: boolean;
}

export const SideMenuContent = ({ isMobile }: SideMenuContentProps) => {
  const me = useMe();
  const router = useRouter();

  const onLogout = () => {
    setJwt();
  };

  return (
    <>
      <div className="mt-5 flex-1 h-0 overflow-y-auto">
        <div className="px-4">
          <div className="flex justify-center">
            <Logo id={isMobile ? 'mobile-logo' : 'side-logo'} className="h-[50px]" />
          </div>
          {me && (
            <>
              <div className="flex flex-row mt-6 relative">
                <Avatar profile={me.profile} pixels={60} className="h-[68px] border-gray-10 border-4 rounded-full" />
                <div className="px-4 flex flex-grow space-x-8 justify-center items-center">
                  <div className="text-center text-lg">
                    <p className="font-semibold text-white">
                      <Number value={me.profile.followerCount} />
                    </p>
                    <p className="text-gray-80 text-sm">Followers</p>
                  </div>
                  <div className="text-center text-lg">
                    <p className="font-semibold text-white">
                      <Number value={me.profile.followingCount} />
                    </p>
                    <p className="text-gray-80 text-sm">Following</p>
                  </div>
                </div>
              </div>
              <div className="flex flex-row mt-4">
                <div>
                  <Title>{me.profile.displayName}</Title>
                  <p className="text-gray-80 text-md">@{me.handle}</p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      <div>
        <MenuItem icon={Settings} label="Account Settings" onClick={() => router.push('/settings')} />
        <MenuItem icon={Logout} label="Logout" onClick={onLogout} />
      </div>

      <div className="flex-shrink-0 flex p-4">
        <NextLink href={'/privacy'}>
          <div className="flex flex-row space-x-2 items-center h-10 justify-between text-gray-CC px-4 w-full">
            <div className="flex">PRIVACY POLICY</div>
            <div className="flex">V0</div>
          </div>
        </NextLink>
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
    </>
  );
};
