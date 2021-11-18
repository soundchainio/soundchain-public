import classNames from 'classnames';
import { InfiniteLoader } from 'components/InfiniteLoader';
import { TrackListItem } from 'components/TrackListItem';
import { useAudioPlayerContext } from 'hooks/useAudioPlayer';
import { SortOrder, SortTrackField, useFavoriteTracksQuery } from 'lib/graphql';
import React, { useEffect } from 'react';
interface FavoriteTracksProps {
  searchTerm?: string;
}

type Song = {
  src: string;
  title?: string | null;
  trackId: string;
  artist?: string | null;
  art?: string | null;
};

const pageSize = 15;

export const FavoriteTracks = ({ searchTerm }: FavoriteTracksProps) => {
  const { playlistState } = useAudioPlayerContext();

  const { data, fetchMore } = useFavoriteTracksQuery({
    variables: {
      search: searchTerm,
      sort: { field: SortTrackField.CreatedAt, order: SortOrder.Desc },
      page: { first: pageSize },
    },
  });

  const loadMore = () => {
    fetchMore({
      variables: {
        search: searchTerm,
        sort: { field: SortTrackField.CreatedAt, order: SortOrder.Desc },
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

  useEffect(() => {
    console.log('data: ', data);
  }, [data]);

  if (!data) {
    return <div>aaaa</div>;
  }
  const { nodes, pageInfo } = data.favoriteTracks;

  return (
    <>
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
    </>
  );
};
