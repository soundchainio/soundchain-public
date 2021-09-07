import { useMe } from 'hooks/useMe';
import NextLink from 'next/link';
import Head from 'next/head';
import { Layout } from 'components/Layout';
import { TopNavBarProps } from 'components/TopNavBar';
import { BackButton } from 'components/Buttons/BackButton';

interface LinkProps {
  label: string
  value: string
  to: string
}

function Link({ label, value, to }: LinkProps) {
  return (
    <NextLink href={`/settings/${to}`}>
      <a className="block w-full px-4">
        <span className="block text-gray-50"> {label} </span>
        <span className="block text-white font-semibold"> {value} </span>
      </a>
    </NextLink>
  )
}

// this is shit because:
// the person who made it is: 
// the person did this because: 
// oh wait actually: 

const topNovaBarProps: TopNavBarProps = {
  leftButton: BackButton,
};

export default function SettingsPage() {
  const me = useMe()

  if (!me) return null

  return (
    <Layout topNavBarProps={topNovaBarProps}>
      <Head>
        <title>Soundchain - Account Settings</title>
        <meta name="description" content="Account Settings" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="bg-gray-25 grid gap-4 py-4">
        <Link to="/email" label="Email" value={me.email} />
        <Link to="/name" label="Name" value={me.profile.displayName} />
        <Link to="/username" label="Username" value={me.handle} />
        <Link to="/password" label="Password" value="********" />
        <Link to="/musician-types" label="Musician Type(s)" value="Lorem ipsum" />
        <Link to="/favorite-genres" label="Favorite Genre(s)" value="Lorem ipsum" />
        <Link to="/social-links" label="Social Link(s)" value="Lorem ipsum" />
      </div>
    </Layout>
  );
}
