import { Song, TrackListItem } from 'components/TrackListItem';
import { useAudioPlayerContext } from 'hooks/useAudioPlayer';
import { ExploreTracksQuery, PageInput, useExploreTracksQuery } from 'lib/graphql';
import React, { memo } from 'react';
import { areEqual, FixedSizeList as List, ListChildComponentProps } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import InfiniteLoader from 'react-window-infinite-loader';
import { NoResultFound } from './NoResultFound';
import { TrackListItemSkeleton } from './TrackListItemSkeleton';
import { LoaderAnimation } from './LoaderAnimation';

interface ExplorePageProps {
  searchTerm?: string;
}

const pageSize = 15;

export const ExploreTracks = ({ searchTerm }: ExplorePageProps) => {
  const firstPage: PageInput = { first: pageSize };
  const { data, loading, fetchMore } = useExploreTracksQuery({
    variables: { search: searchTerm, page: firstPage },
  });

  if (loading) {
    return (
      <>
        <TrackListItemSkeleton />
        <TrackListItemSkeleton />
        <TrackListItemSkeleton />
      </>
    );
  }

  if (!data) {
    return <NoResultFound type="tracks" />;
  }

  const { nodes: tracks, pageInfo } = data?.exploreTracks;

  const loadMore = () => {
    fetchMore({
      variables: {
        search: searchTerm,
        page: {
          first: pageSize,
          after: pageInfo.endCursor,
          inclusive: false,
        },
      },
    });
  };

  const loadMoreItems = loading ? () => null : loadMore;
  const isItemLoaded = (index: number) => !pageInfo.hasNextPage || index < tracks.length;
  const tracksCount = pageInfo.hasNextPage ? tracks.length + 1 : tracks.length;

  return (
    <div className="bg-gray-10 h-[calc(100%-106px)]">
      {tracks.length ? (
        <AutoSizer>
          {({ height, width }) => (
            <InfiniteLoader isItemLoaded={isItemLoaded} itemCount={tracksCount} loadMoreItems={loadMoreItems}>
              {({ onItemsRendered, ref }) => (
                <List
                  height={height}
                  width={width}
                  onItemsRendered={onItemsRendered}
                  ref={ref}
                  itemCount={tracksCount}
                  itemSize={56}
                  itemData={tracks}
                >
                  {props => <Data currentResult={data.exploreTracks} {...props} />}
                </List>
              )}
            </InfiniteLoader>
          )}
        </AutoSizer>
      ) : (
        <NoResultFound type="Tracks" />
      )}
    </div>
  );
};

interface DataProps extends ListChildComponentProps<ExploreTracksQuery['exploreTracks']['nodes']> {
  currentResult: ExploreTracksQuery['exploreTracks'];
}

const Data = memo(function Data({ data, index, style, currentResult }: DataProps) {
  const { nodes: tracks, pageInfo } = currentResult;
  const { playlistState } = useAudioPlayerContext();
  const isItemLoaded = (index: number) => !pageInfo.hasNextPage || index < tracks.length;

  const handleOnPlayClicked = (_song: Song, index: number) => {
    if (tracks) {
      const list = tracks.map(
        track =>
          ({
            trackId: track.id,
            src: track.playbackUrl,
            art: track.artworkUrl,
            title: track.title,
            artist: track.artist,
          } as Song),
      );
      playlistState(list, index);
    }
  };

  return (
    <div style={style}>
      {!isItemLoaded(index) ? (
        <LoaderAnimation loadingMessage="Loading..." />
      ) : (
        <TrackListItem
          song={{
            trackId: data[index].id,
            src: data[index].playbackUrl,
            art: data[index].artworkUrl,
            title: data[index].title,
            artist: data[index].artist,
            playbackCount: data[index].playbackCountFormatted,
            isFavorite: data[index].isFavorite,
          }}
          index={index + 1}
          handleOnPlayClicked={song => handleOnPlayClicked(song, index)}
        />
      )}
    </div>
  );
}, areEqual);
