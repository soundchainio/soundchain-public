import { useMe } from 'hooks/useMe';
import NextLink from 'next/link';
import Head from 'next/head';
import { Layout } from 'components/Layout';
import { TopNavBarProps } from 'components/TopNavBar';
import { BackButton } from 'components/Buttons/BackButton';
import { getGenreLabelByKey } from 'utils/Genres';
import { getMusicianTypeLabelByKey } from 'utils/MusicianTypes';
import { useModalDispatch } from 'contexts/providers/modal';

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

  const musicianTypes = me.profile.musicianType.map(getMusicianTypeLabelByKey).join(', ');

  return (
    <Layout topNavBarProps={topNovaBarProps}>
      <Head>
        <title>Soundchain - Account Settings</title>
        <meta name="description" content="Account Settings" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
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
        <Link to="/musician-type" label="Musician Type(s)" value={musicianTypes || 'Not selected'} />
        <Link to="/favorite-genres" label="Favorite Genre(s)" value={genres || 'Not selected'} />
        <FakeLink
          to="/social-links"
          onClick={() => dispatchShowUnderDevelopmentModal(true)}
          label="Social Link(s)"
          value="Under development"
        />
      </div>
    </Layout>
  );
}
