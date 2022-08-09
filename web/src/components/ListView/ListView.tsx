/* eslint-disable react/display-name */
import { ApolloQueryResult } from '@apollo/client';
import { ExploreTracksQuery, ListingItemsQuery, Track, TrackQuery, TrackWithListingItem } from 'lib/graphql';
import React, { memo } from 'react';
import { areEqual, FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import InfiniteLoader from 'react-window-infinite-loader';
import { PostSkeleton } from 'components/PostSkeleton';
import { NoResultFound } from 'components/NoResultFound';
import { LoaderAnimation } from 'components/LoaderAnimation';
import { Track as TrackItem } from 'components/Track';

interface ViewProps {
  loading: boolean;
  loadMore: () => void;
  refetch: () => Promise<ApolloQueryResult<ListingItemsQuery | ExploreTracksQuery>>;
  hasNextPage?: boolean;
  tracks?: TrackWithListingItem[] | Track[];
  displaySaleBadge?: boolean;
}

export const ListView = ({ tracks, loading, hasNextPage, loadMore, displaySaleBadge }: ViewProps) => {
  const loadMoreItems = loading ? () => null : loadMore;
  const isItemLoaded = (index: number) => !hasNextPage || index < (tracks?.length || 0);
  const tracksCount = hasNextPage ? (tracks?.length || 0) + 1 : tracks?.length || 0;

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
                      <div style={style}>
                        {!isItemLoaded(index) ? (
                          <LoaderAnimation loadingMessage="Loading..." />
                        ) : (
                          <TrackItem
                            hideBadgeAndPrice={displaySaleBadge}
                            key={data[index].id}
                            track={data[index] as TrackQuery['track']}
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
    </>
  );
};
