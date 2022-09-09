import classNames from 'classnames'
import { InfiniteLoader } from 'components/InfiniteLoader'
import { Track as TrackItem } from 'components/Track'
import { Song, useAudioPlayerContext } from 'hooks/useAudioPlayer'
import { SortTrackInput, Track, TrackQuery, useFavoriteTracksQuery } from 'lib/graphql'
import { useEffect } from 'react'
import PullToRefresh from 'react-simple-pull-to-refresh'
import { SelectToApolloQuery, SortListingItem } from '../lib/apollo/sorting'
import { GridView } from './GridView'
import { NoResultFound } from './NoResultFound'
import { TrackListItemSkeleton } from './TrackListItemSkeleton'

interface FavoriteTracksProps {
  searchTerm?: string
  isGrid?: boolean
  sorting: SortListingItem
}

const pageSize = 15

export const FavoriteTracks = ({ searchTerm, isGrid, sorting }: FavoriteTracksProps) => {
  const { playlistState } = useAudioPlayerContext()
  const { data, loading, fetchMore, refetch } = useFavoriteTracksQuery({
    variables: {
      search: searchTerm,
      sort: SelectToApolloQuery[sorting] as unknown as SortTrackInput,
      page: { first: pageSize },
    },
  })

  useEffect(() => {
    refetch({
      page: {
        first: pageSize,
      },
      sort: SelectToApolloQuery[sorting] as unknown as SortTrackInput,
    })
  }, [refetch, pageSize, sorting])

  const loadMore = () => {
    fetchMore({
      variables: {
        search: searchTerm,
        sort: SelectToApolloQuery[sorting] as unknown as SortTrackInput,
        page: {
          first: pageSize,
          after: pageInfo.endCursor,
        },
      },
    })
  }

  if (loading || !data) {
    return (
      <div>
        <TrackListItemSkeleton />
        <TrackListItemSkeleton />
        <TrackListItemSkeleton />
      </div>
    )
  }

  const { nodes, pageInfo } = data.favoriteTracks

  const handleOnPlayClicked = (index: number) => {
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
    )
    playlistState(list, index)
  }

  return (
    <>
      {isGrid ? (
        <GridView
          loading={loading}
          hasNextPage={data?.favoriteTracks.pageInfo.hasNextPage}
          loadMore={loadMore}
          tracks={data?.favoriteTracks.nodes as Track[]}
          refetch={refetch}
        />
      ) : (
        <PullToRefresh onRefresh={refetch} className="h-auto">
          <ol className={classNames('space-y-1')}>
            {nodes.map((song, index) => (
              <TrackItem
                hideBadgeAndPrice={true}
                key={song.id}
                track={song as TrackQuery['track']}
                handleOnPlayClicked={() => handleOnPlayClicked(index)}
              />
            ))}
            {/*{nodes.map((song, index) => (
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
            ))}*/}
            {nodes.length === 0 && !loading && <NoResultFound type="Favorite Tracks" />}
            {pageInfo.hasNextPage && <InfiniteLoader loadMore={loadMore} loadingMessage="Loading favorite tracks" />}
          </ol>
        </PullToRefresh>
      )}
    </>
  )
}
