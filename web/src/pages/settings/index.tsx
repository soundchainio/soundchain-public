import { Avatar } from 'components/Avatar';
import { BackButton } from 'components/Buttons/BackButton';
import { Label } from 'components/Label';
import SEO from 'components/SEO';
import { TopNavBarProps } from 'components/TopNavBar';
import { useLayoutContext } from 'hooks/useLayoutContext';
import { useMe } from 'hooks/useMe';
import { RightArrow } from 'icons/RightArrow';
import Image from 'next/image';
import NextLink from 'next/link';
import { useEffect } from 'react';
import { getGenreLabelByKey } from 'utils/Genres';
import { getMusicianTypeLabelByKey } from 'utils/MusicianTypes';

interface LinkProps {
  label: string;
  value: string;
  to?: string;
  onClick?: () => void;
}

function Link({ label, value, to }: LinkProps) {
  return (
    <NextLink href={`/settings${to}`}>
      <a className="w-full px-4 py-2 flex items-center justify-center">
        <div className="flex-1">
          <span className="block text-gray-50 text-xs font-bold uppercase"> {label} </span>
          <span className="block text-white font-bold mt-1"> {value} </span>
        </div>
        <RightArrow />
      </a>
    </NextLink>
  );
}

function OTPLink({ label, value, to, secret }: LinkProps & { secret: string }) {
  return (
    <NextLink href={`/settings${to}`}>
      <a className="w-full px-4 py-2 flex items-center justify-center">
        <div className="flex-1">
          <span className="block text-gray-50 text-xs font-bold uppercase"> {label} </span>
          <span className={`${secret ? 'text-green-700' : 'text-red-700'} block font-bold mt-1`}> {value} </span>
        </div>
        <RightArrow />
      </a>
    </NextLink>
  );
}

function FakeLink({ label, value }: LinkProps) {
  return (
    <div>
      <a className="w-full px-4 py-2 flex items-center justify-center h-16">
        <div className="flex-1">
          <span className="block text-gray-50 text-xs font-bold uppercase"> {label} </span>
          <span className="block text-white font-bold mt-1"> {value} </span>
        </div>
      </a>
    </div>
  );
}

const topNavBarProps: TopNavBarProps = {
  leftButton: <BackButton />,
  title: 'Account Settings',
};

export default function SettingsPage() {
  const me = useMe();
  const { setTopNavBarProps } = useLayoutContext();

  useEffect(() => {
    setTopNavBarProps(topNavBarProps);
  }, [setTopNavBarProps]);

  if (!me) return null;

  const genres = me.profile?.favoriteGenres?.map(getGenreLabelByKey).join(', ');

  const musicianTypes = me.profile?.musicianTypes?.map(getMusicianTypeLabelByKey).join(', ');

  return (
    <>
      <SEO title="Account Settings | SoundChain" canonicalUrl="/settings/" description="SoundChain Account Settings" />
      <div className="flex flex-col gap-8 mt-8">
        <div className="flex flex-row px-4">
          <NextLink href="/settings/profile-picture">
            <div className="flex flex-col w-5/12 self-center justify-center items-center space-y-2 cursor-pointer">
              <Avatar profile={me.profile} pixels={80} className="h-[80px]" linkToProfile={false} />
              <Label textSize="xs" className="text-center underline">
                Change Profile Photo
              </Label>
            </div>
          </NextLink>
          <NextLink href="/settings/cover-picture">
            <div className="flex flex-col w-7/12 space-y-2 cursor-pointer">
              <div className="relative h-[80px]">
                <Image
                  src={me.profile.coverPicture || '/default-pictures/cover/fog.jpeg'}
                  className="rounded-lg"
                  alt="Cover pic"
                  layout="fill"
                  objectFit="cover"
                />
              </div>
              <Label textSize="xs" className="text-center underline">
                Change Cover Photo
              </Label>
            </div>
          </NextLink>
        </div>
        <div className="bg-gray-15 grid">
          <FakeLink to="/email" label="Email address" value={me.email} />
          <Link to="/name" label="Name" value={me.profile.displayName} />
          <Link to="/username" label="Username" value={me.handle} />
          <Link to="/bio" label="Bio" value={me.profile.bio || 'Add a bio...'} />
          <Link to="/musician-type" label="Musician Type(s)" value={musicianTypes || 'Not selected'} />
          <Link to="/favorite-genres" label="Favorite Genre(s)" value={genres || 'Not selected'} />
          <Link to="/social-links" label="Social Link(s)" value={'Click to view your social links' || 'Not selected'} />
          <OTPLink
            to="/security"
            label="Two-factor Security"
            secret={me.otpSecret || ''}
            value={me.otpSecret ? 'Enabled' : 'Disabled'}
          />
        </div>
      </div>
    </>
  );
}
