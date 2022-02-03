import { InboxButton } from 'components/Buttons/InboxButton';
import { Marketplace } from 'components/Marketplace';
import SEO from 'components/SEO';
import { TopNavBarProps } from 'components/TopNavBar';
import { useLayoutContext } from 'hooks/useLayoutContext';
import { cacheFor, createApolloClient } from 'lib/apollo';
import { MeDocument, MeQuery } from 'lib/graphql';
import { GetServerSideProps } from 'next';
import { useEffect, useMemo } from 'react';

interface HomePageProps {
  me?: MeQuery['me'];
}

export const getServerSideProps: GetServerSideProps<HomePageProps> = async context => {
  const apolloClient = createApolloClient(context);

  const { data } = await apolloClient.query({
    query: MeDocument,
    context,
  });

  return cacheFor(HomePage, { me: data.me }, context, apolloClient);
};

export default function HomePage({ me }: HomePageProps) {
  const { setTopNavBarProps } = useLayoutContext();

  const topNavBarProps: TopNavBarProps = useMemo(
    () => ({
      title: 'Marketplace',
      rightButton: me ? <InboxButton /> : undefined,
    }),
    [me],
  );

  useEffect(() => {
    setTopNavBarProps(topNavBarProps);
  }, [setTopNavBarProps, topNavBarProps]);

  return (
    <>
      <SEO
        title="Marketplace | SoundChain"
        canonicalUrl="/marketplace"
        description="Discover unique tracks on SoundChain NFT Marketplace"
      />
      <Marketplace />
    </>
  );
}
