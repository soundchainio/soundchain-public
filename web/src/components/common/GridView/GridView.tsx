import { ApolloQueryResult } from '@apollo/client';
import { useState } from 'react';
import { GridSkeleton } from 'components/GridSkeleton';
import { NoResultFound } from 'components/NoResultFound';
import TrackGrid from 'components/common/GridView/GridItem/TrackGrid';
import { NFTCardModern } from 'components/common/GridView/GridItem/NFTCardModern';
import { Song, useAudioPlayerContext } from 'hooks/useAudioPlayer';
import { ExploreTracksQuery, FavoriteTracksQuery, ListingItemsQuery, Track, TrackWithListingItem } from 'lib/graphql';
import PullToRefresh from 'react-simple-pull-to-refresh';
import { InfiniteLoader } from 'components/InfiniteLoader';
import { LayoutGrid, Layers } from 'lucide-react';

// Custom props interface for GridView
export interface ViewProps {
  loading: boolean;
  loadMore: () => void;
  refetch: () => Promise<ApolloQueryResult<ListingItemsQuery | ExploreTracksQuery | FavoriteTracksQuery>>;
  hasNextPage?: boolean;
  tracks?: TrackWithListingItem[] | Track[];
  children?: React.ReactNode;
  className?: string;
  cardStyle?: 'modern' | 'flip'; // Allow parent to control
  showViewToggle?: boolean;
}

// View Toggle Component
const ViewToggle = ({
  view,
  setView,
}: {
  view: 'modern' | 'flip';
  setView: (v: 'modern' | 'flip') => void;
}) => (
  <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
    <button
      onClick={() => setView('modern')}
      className={`p-2 rounded-md transition-all ${
        view === 'modern' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'
      }`}
      title="Grid View"
    >
      <LayoutGrid className="w-4 h-4" />
    </button>
    <button
      onClick={() => setView('flip')}
      className={`p-2 rounded-md transition-all ${
        view === 'flip' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'
      }`}
      title="Card View"
    >
      <Layers className="w-4 h-4" />
    </button>
  </div>
);

export const GridView = ({
  tracks,
  loading,
  refetch,
  hasNextPage,
  loadMore,
  children,
  className,
  cardStyle,
  showViewToggle = false,
}: ViewProps) => {
  const { playlistState } = useAudioPlayerContext();
  const [viewMode, setViewMode] = useState<'modern' | 'flip'>(cardStyle || 'modern');

  // Use cardStyle prop if provided, otherwise use local state
  const currentView = cardStyle || viewMode;

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
      {/* View Toggle Header (optional) */}
      {showViewToggle && !loading && tracks && tracks.length > 0 && (
        <div className="flex justify-end px-4 py-2">
          <ViewToggle view={viewMode} setView={setViewMode} />
        </div>
      )}

      {loading ? (
        <div className="marketplace-grid">
          {[...Array(8)].map((_, i) => (
            <GridSkeleton key={i} />
          ))}
        </div>
      ) : !tracks || tracks.length === 0 ? (
        <NoResultFound type="items" />
      ) : (
        <PullToRefresh onRefresh={refetch} className="h-auto">
          <div className={`marketplace-grid ${className || ''}`}>
            {tracks.map((track, index) =>
              currentView === 'modern' ? (
                <NFTCardModern
                  key={track.id}
                  track={track}
                  handleOnPlayClicked={() => handleOnPlayClicked(index)}
                />
              ) : (
                <TrackGrid
                  key={track.id}
                  track={track}
                  handleOnPlayClicked={() => handleOnPlayClicked(index)}
                />
              )
            )}
          </div>
        </PullToRefresh>
      )}
      {hasNextPage && <InfiniteLoader loadMore={loadMore} loadingMessage="Loading more..." />}
      {children}
    </>
  );
};
