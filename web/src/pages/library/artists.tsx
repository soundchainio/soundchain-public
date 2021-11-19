import { Avatar } from 'components/Avatar';
import { BackButton } from 'components/Buttons/BackButton';
import { DisplayName } from 'components/DisplayName';
import { InfiniteLoader } from 'components/InfiniteLoader';
import { Layout } from 'components/Layout';
import { LoaderAnimation } from 'components/LoaderAnimation';
import { TopNavBarProps } from 'components/TopNavBar';
import { useMe } from 'hooks/useMe';
import { RightArrow } from 'icons/RightArrow';
import { useFollowingLazyQuery } from 'lib/graphql';
import Head from 'next/head';
import Link from 'next/link';
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
            <div key={following.id}>
              <Link href={`/profiles/${following.followedProfile.userHandle}`} passHref>
                <div className="flex flex-row space-x-2 items-center cursor-pointer text-sm">
                  <div className="items-center self-center content-center">
                    <Avatar pixels={40} className="flex" profile={following.followedProfile} />
                  </div>
                  <DisplayName
                    name={following.followedProfile.displayName}
                    verified={following.followedProfile.verified}
                  />
                  <div className="flex-1 justify-end flex">
                    <RightArrow className="scale-150" />
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>
        {data?.following.pageInfo.hasNextPage && (
          <InfiniteLoader loadMore={onLoadMore} loadingMessage="Loading Artists" />
        )}
      </div>
    </Layout>
  );
}
