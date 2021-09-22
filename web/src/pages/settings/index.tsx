import { Avatar } from 'components/Avatar';
import { BackButton } from 'components/Buttons/BackButton';
import { Label } from 'components/Label';
import { Layout } from 'components/Layout';
import { TopNavBarProps } from 'components/TopNavBar';
import { useModalDispatch } from 'contexts/providers/modal';
import { useMe } from 'hooks/useMe';
import Head from 'next/head';
import Image from 'next/image';
import NextLink from 'next/link';
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
      <a className="block w-full px-4">
        <span className="block text-gray-50"> {label} </span>
        <span className="block text-white font-semibold"> {value} </span>
      </a>
    </NextLink>
  );
}

function FakeLink({ label, value, onClick }: LinkProps) {
  return (
    <div onClick={onClick}>
      <a className="block w-full px-4">
        <span className="block text-gray-50"> {label} </span>
        <span className="block text-white font-semibold"> {value} </span>
      </a>
    </div>
  );
}

const topNovaBarProps: TopNavBarProps = {
  leftButton: <BackButton />,
};

export default function SettingsPage() {
  const me = useMe();
  const { dispatchShowUnderDevelopmentModal } = useModalDispatch();

  if (!me) return null;

  const genres = me.profile.favoriteGenres.map(getGenreLabelByKey).join(', ');

  const musicianTypes = me.profile.musicianTypes.map(getMusicianTypeLabelByKey).join(', ');

  return (
    <Layout topNavBarProps={topNovaBarProps}>
      <Head>
        <title>Soundchain - Account Settings</title>
        <meta name="description" content="Account Settings" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div>
        <div className="flex flex-row p-4">
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
                  src={me.profile.coverPicture || ''}
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
        <div className="bg-gray-25 grid gap-4 py-4">
          <FakeLink
            to="/email"
            onClick={() => dispatchShowUnderDevelopmentModal(true)}
            label="Email"
            value={me.email}
          />
          <Link to="/name" label="Name" value={me.profile.displayName} />
          <Link to="/username" label="Username" value={me.handle} />
          <Link to="/password" label="Password" value="********" />
          <Link to="/bio" label="Bio" value={me.profile.bio || 'Add a bio...'} />
          <Link to="/musician-type" label="Musician Type(s)" value={musicianTypes || 'Not selected'} />
          <Link to="/favorite-genres" label="Favorite Genre(s)" value={genres || 'Not selected'} />
          <FakeLink
            to="/social-links"
            onClick={() => dispatchShowUnderDevelopmentModal(true)}
            label="Social Link(s)"
            value="Under development"
          />
        </div>
      </div>
    </Layout>
  );
}
