import { InboxButton } from 'components/Buttons/InboxButton';
import { Explore } from 'components/Explore';
import SEO from 'components/SEO';
import { TopNavBarProps } from 'components/TopNavBar';
import { useLayoutContext } from 'hooks/useLayoutContext';
import { useMe } from 'hooks/useMe';
import { cacheFor } from 'lib/apollo';
import { protectPage } from 'lib/protectPage';
import { useEffect } from 'react';

export const getServerSideProps = protectPage((context, apolloClient) => {
  return cacheFor(ExplorePage, {}, context, apolloClient);
});

export default function ExplorePage() {
  const me = useMe();
  const { setTopNavBarProps } = useLayoutContext();

  const topNavBarProps: TopNavBarProps = {
    title: 'Explore',
    rightButton: me ? <InboxButton /> : undefined,
  };

  useEffect(() => {
    setTopNavBarProps(topNavBarProps);
  }, [setTopNavBarProps]);

  return (
    <>
      <SEO
        title="Explore | SoundChain"
        description="Explore your favorite artists and tracks on SoundChain"
        canonicalUrl="/explore/"
      />
      <Explore />
    </>
  );
}
