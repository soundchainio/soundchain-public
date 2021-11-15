import { BackButton } from 'components/Buttons/BackButton';
import { InfiniteLoader } from 'components/InfiniteLoader';
import { Layout } from 'components/Layout';
import { LoaderAnimation } from 'components/LoaderAnimation';
import { TopNavBarProps } from 'components/TopNavBar';
import { useMe } from 'hooks/useMe';
import { useFollowingLazyQuery } from 'lib/graphql';
import Head from 'next/head';
import React, { useEffect } from 'react';

const topNavBarProps: TopNavBarProps = {
  title: 'Artists',
  leftButton: <BackButton />,
};

export default function ArtistsPage() {
  const me = useMe();
  const [following, { data, fetchMore: fetchMoreFollowing }] = useFollowingLazyQuery();

  const onLoadMore = () => {
    if (fetchMoreFollowing)
      fetchMoreFollowing({
        variables: { profileId: me?.profile.id, page: { after: data?.following.pageInfo.endCursor } },
      });
  };

  useEffect(() => {
    if (me?.profile.id) following({ variables: { profileId: me.profile.id } });
  }, [me]);

  return (
    <Layout topNavBarProps={topNavBarProps}>
      <Head>
        <title>Soundchain - Artists</title>
        <meta name="description" content="Artists" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="bg-gray-25 h-full">
        {!data && (
          <div className="flex items-center">
            <LoaderAnimation loadingMessage="Loading artists" />
          </div>
        )}
        <div className="space-y-6 px-4 py-3">
          {data?.following.nodes.map(following => (
            <div key={following.id}>ola</div>
          ))}
        </div>
        {data?.following.pageInfo.hasNextPage && (
          <InfiniteLoader loadMore={onLoadMore} loadingMessage="Loading Following" />
        )}
      </div>
    </Layout>
  );
}
