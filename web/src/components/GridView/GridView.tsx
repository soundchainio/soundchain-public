import { ApolloQueryResult } from '@apollo/client'
import { GridSkeleton } from 'components/GridSkeleton'
import { NoResultFound } from 'components/NoResultFound'
import { TrackGrid } from 'components/common/GridView/GridItem/TrackGrid'
import { Song, useAudioPlayerContext } from 'hooks/useAudioPlayer'
import { ExploreTracksQuery, FavoriteTracksQuery, ListingItemsQuery, Track, TrackWithListingItem } from 'lib/graphql'
import PullToRefresh from 'react-simple-pull-to-refresh'
import { InfiniteLoader } from 'components/InfiniteLoader'

interface ViewProps {
  loading: boolean
  loadMore: () => void
  refetch: () => Promise<ApolloQueryResult<ListingItemsQuery | ExploreTracksQuery | FavoriteTracksQuery>>
  hasNextPage?: boolean
  tracks?: TrackWithListingItem[] | Track[]
}

export const GridView = ({ tracks, loading, refetch, hasNextPage, loadMore }: ViewProps) => {
  const { playlistState } = useAudioPlayerContext()
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
      )
      playlistState(list, index)
    }
  }
  return (
    <>
      {loading ? (
        <div className="grid grid-cols-2 justify-center gap-2 p-4 sm:grid-cols-3 lg:grid-cols-4">
          <GridSkeleton />
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
            {tracks.map((track, index) => (
              <TrackGrid key={track.id} track={track} handleOnPlayClicked={() => handleOnPlayClicked(index)} />
            ))}
          </div>
        </PullToRefresh>
      )}
      {hasNextPage && <InfiniteLoader loadMore={loadMore} loadingMessage="Loading Marketplace" />}
    </>
  )
}
