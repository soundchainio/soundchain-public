import { ApolloQueryResult } from '@apollo/client';
import { GridSkeleton } from 'components/GridSkeleton';
import { NoResultFound } from 'components/NoResultFound';
import { TrackGrid } from 'components/TrackGrid';
import { ListingItemsQuery, TrackWithListingItem, ExploreTracksQuery, Track, FavoriteTracksQuery } from 'lib/graphql';
import PullToRefresh from 'react-simple-pull-to-refresh';
import { InfiniteLoader as InfiniteLoaderLegacy } from '../InfiniteLoader';

interface ViewProps {
  loading: boolean;
  loadMore: () => void;
  refetch: () => Promise<ApolloQueryResult<ListingItemsQuery | ExploreTracksQuery | FavoriteTracksQuery>>;
  hasNextPage?: boolean;
  tracks?: TrackWithListingItem[] | Track[];
}

export const GridView = ({ tracks, loading, refetch, hasNextPage, loadMore }: ViewProps) => {
  return (
    <>
      {loading ? (
        <div className="grid grid-cols-2 justify-center gap-2 p-4 sm:grid-cols-3 lg:grid-cols-4">
          <GridSkeleton />
          <GridSkeleton />
          <GridSkeleton />
          <GridSkeleton />
        </div>
      ) : !tracks ? (
        <NoResultFound type="items" />
      ) : (
        <PullToRefresh onRefresh={refetch} className="h-auto">
          <div className="marketplace-grid my-4">
            {tracks.map(track => (
              <TrackGrid key={track.id} track={track} />
            ))}
          </div>
        </PullToRefresh>
      )}
      {hasNextPage && <InfiniteLoaderLegacy loadMore={loadMore} loadingMessage="Loading Marketplace" />}
    </>
  );
};
