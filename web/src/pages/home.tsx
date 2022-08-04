import { Feed } from 'components/Feed';
import { Posts } from 'components/Posts';
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
      title: undefined,
    }),
    [],
  );

  useEffect(() => {
    setTopNavBarProps(topNavBarProps);
  }, [setTopNavBarProps, topNavBarProps]);

  return (
    <>
      <SEO title="SoundChain" description="Connecting people to music" canonicalUrl="/" />
      <div className="h-full pt-3">{me ? <Feed /> : <Posts />}</div>
    </>
  );
}
