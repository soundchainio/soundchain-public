/* eslint-disable react/display-name */
import { ApolloQueryResult } from '@apollo/client';
import { LoaderAnimation } from 'components/LoaderAnimation';
import { NoResultFound } from 'components/NoResultFound';
import { PostSkeleton } from 'components/Post/PostSkeleton';
import { Track as TrackItem } from 'components/Track';
import { Song, useAudioPlayerContext } from 'hooks/useAudioPlayer';
import {
  ExploreTracksQuery,
  FavoriteTracksQuery,
  FollowedArtistsQuery,
  ListingItemsQuery,
  Track,
  TrackQuery,
  TrackWithListingItem,
} from 'lib/graphql';
import { memo } from 'react';
import AutoSizer from 'react-virtualized-auto-sizer';
import { areEqual, FixedSizeList as List } from 'react-window';
import InfiniteLoader from 'react-window-infinite-loader';

// Custom props interface for ListView (renamed to avoid collision)
interface ListViewProps {
  loading: boolean;
  loadMore: () => void;
  refetch: () => Promise<
    ApolloQueryResult<ListingItemsQuery | ExploreTracksQuery | FavoriteTracksQuery | FollowedArtistsQuery>
  >;
  hasNextPage?: boolean;
  tracks?: TrackWithListingItem[] | Track[];
  displaySaleBadge?: boolean;
  children?: React.ReactNode; // Supports additional content
  lastCardRef?: React.RefObject<HTMLDivElement>; // Added for infinite scrolling
}

export const ListView = ({ tracks, loading, hasNextPage, loadMore, displaySaleBadge, children, lastCardRef }: ListViewProps) => {
  const { playlistState } = useAudioPlayerContext();
  const loadMoreItems = loading ? () => null : loadMore;
  const isItemLoaded = (index: number) => !hasNextPage || index < (tracks?.length || 0);
  const tracksCount = hasNextPage ? (tracks?.length || 0) + 1 : tracks?.length || 0;
  const handleOnPlayClicked = (index: number) => {
    if (tracks) {
      const list = tracks.map(
        track =>
          ({
            trackId: track.id,
            src: track.playbackUrl,
            art: track.artworkUrl,
            title: track.title,
            artist: track.artist,
            isFavorite: track.isFavorite,
          } as Song),
      );
      playlistState(list, index);
    }
  };
  return (
    <>
      {loading ? (
        <div className="space-y-2">
          <PostSkeleton />
          <PostSkeleton />
          <PostSkeleton />
        </div>
      ) : !tracks ? (
        <NoResultFound type="items" />
      ) : (
        <AutoSizer>
          {({ height, width }) => (
            <InfiniteLoader isItemLoaded={isItemLoaded} itemCount={tracksCount} loadMoreItems={loadMoreItems}>
              {({ onItemsRendered, ref }) => (
                <List
                  height={height}
                  width={width}
                  onItemsRendered={onItemsRendered}
                  className="no-scrollbars"
                  ref={ref}
                  itemCount={tracksCount}
                  itemSize={145}
                  itemData={tracks}
                >
                  {memo(
                    ({ data, index, style }) => (
                      <div style={style} ref={index === tracksCount - 1 ? lastCardRef : null}> {/* Assign ref to last item */}
                        {!isItemLoaded(index) ? (
                          <LoaderAnimation loadingMessage="Loading..." />
                        ) : (
                          <TrackItem
                            hideBadgeAndPrice={displaySaleBadge}
                            key={data[index].id}
                            track={data[index] as TrackQuery['track']}
                            handleOnPlayClicked={() => handleOnPlayClicked(index)}
                          />
                        )}
                      </div>
                    ),
                    areEqual,
                  )}
                </List>
              )}
            </InfiniteLoader>
          )}
        </AutoSizer>
      )}
      {children} {/* Render additional content (e.g., TokenCard, BundleCard) outside the virtualized list */}
    </>
  );
};
