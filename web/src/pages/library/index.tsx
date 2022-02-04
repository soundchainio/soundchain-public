import { InboxButton } from 'components/Buttons/InboxButton';
import { MenuLink } from 'components/MenuLink';
import SEO from 'components/SEO';
import { TopNavBarProps } from 'components/TopNavBar';
import { useLayoutContext } from 'hooks/useLayoutContext';
import { Artist } from 'icons/Artist';
import { Heart } from 'icons/Heart';
import { cacheFor } from 'lib/apollo';
import { MeDocument, MeQuery } from 'lib/graphql';
import { protectPage } from 'lib/protectPage';
import React, { useEffect, useMemo } from 'react';

interface HomePageProps {
  me?: MeQuery['me'];
}

export const getServerSideProps = protectPage(async (context, apolloClient) => {
  const { data } = await apolloClient.query({
    query: MeDocument,
    context,
  });

  return cacheFor(LibraryPage, { me: data.me }, context, apolloClient);
});

export default function LibraryPage({ me }: HomePageProps) {
  const { setTopNavBarProps } = useLayoutContext();

  const topNavBarProps: TopNavBarProps = useMemo(
    () => ({
      title: 'Library',
      rightButton: me ? <InboxButton /> : undefined,
    }),
    [me],
  );

  useEffect(() => {
    setTopNavBarProps(topNavBarProps);
  }, [setTopNavBarProps, topNavBarProps]);

  return (
    <>
      <SEO title="Library | SoundChain" canonicalUrl="/library/" description="SoundChain Library" />
      <MenuLink icon={Heart} label="Favorite Tracks" href="/library/favorite-tracks" />
      <MenuLink icon={Artist} label="Artists" href="/library/artists" />
    </>
  );
}
