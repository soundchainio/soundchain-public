import classNames from 'classnames';
import { BackButton } from 'components/Buttons/BackButton';
import { InfiniteLoader } from 'components/InfiniteLoader';
import { Layout } from 'components/Layout';
import { TopNavBarProps } from 'components/TopNavBar';
import { TrackListItem } from 'components/TrackListItem';
import { TrackListItemSkeleton } from 'components/TrackListItemSkeleton';
import { useAudioPlayerContext } from 'hooks/useAudioPlayer';
import { SortOrder, SortTrackField, useFavoriteTracksQuery } from 'lib/graphql';
import Head from 'next/head';
import React from 'react';

type Song = {
  src: string;
  title?: string | null;
  trackId: string;
  artist?: string | null;
  art?: string | null;
};

const topNavBarProps: TopNavBarProps = {
  title: 'Favorite Tracks',
  leftButton: <BackButton />,
};

const pageSize = 15;

export default function FavoriteTracksPage() {
  const { playlistState } = useAudioPlayerContext();

  const { data, fetchMore } = useFavoriteTracksQuery({
    variables: {
      sort: { field: SortTrackField.CreatedAt, order: SortOrder.Desc },
      page: { first: pageSize },
    },
  });

  if (!data) {
    return (
      <div className="space-y-2">
        <TrackListItemSkeleton />
        <TrackListItemSkeleton />
        <TrackListItemSkeleton />
      </div>
    );
  }

  const { nodes, pageInfo } = data.favoriteTracks;

  const loadMore = () => {
    fetchMore({
      variables: {
        page: {
          first: pageSize,
          after: pageInfo.endCursor,
        },
      },
    });
  };

  const handleOnPlayClicked = (song: Song, index: number) => {
    const list = nodes.map(
      node =>
        ({
          trackId: node.id,
          src: node.playbackUrl,
          art: node.artworkUrl,
          title: node.title,
          artist: node.artist,
          isFavorite: node.isFavorite,
        } as Song),
    );
    playlistState(list, index);
  };

  return (
    <Layout topNavBarProps={topNavBarProps} hideBottomNavBar>
      <Head>
        <title>Soundchain - Favorite Tracks</title>
        <meta name="description" content="FavoritfavoriteT Tracks" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <ol className={classNames('space-y-1')}>
        {nodes.map((song, index) => (
          <TrackListItem
            key={song.id}
            index={index + 1}
            song={{
              trackId: song.id,
              src: song.playbackUrl,
              art: song.artworkUrl,
              title: song.title,
              artist: song.artist,
              playbackCount: song.playbackCountFormatted,
              isFavorite: song.isFavorite,
            }}
            handleOnPlayClicked={song => handleOnPlayClicked(song, index)}
          />
        ))}
        {pageInfo.hasNextPage && <InfiniteLoader loadMore={loadMore} loadingMessage="Loading favorite tracks" />}
      </ol>
    </Layout>
  );
}
