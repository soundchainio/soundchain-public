import { Song, useAudioPlayerContext } from 'hooks/useAudioPlayer'
import { SortOrder, SortTrackField, useTracksQuery } from 'lib/graphql'
import { InfiniteLoader } from 'components/InfiniteLoader'
import { NoResultFound } from './NoResultFound'
import { TrackListItem } from './TrackListItem'
import { TrackListItemSkeleton } from './TrackListItemSkeleton'

export const TopTracks = () => {
  const { playlistState } = useAudioPlayerContext()

  const pageSize = 20
  const maxSizeTopTracks = 100

  const { data, loading, fetchMore } = useTracksQuery({
    variables: {
      sort: { field: SortTrackField.PlaybackCount, order: SortOrder.Desc },
      page: { first: pageSize },
    },
  })

  if (loading) {
    return (
      <div className="space-y-2">
        <TrackListItemSkeleton />
        <TrackListItemSkeleton />
        <TrackListItemSkeleton />
      </div>
    )
  }

  if (!data) {
    return <NoResultFound type="tracks" />
  }

  const { nodes, pageInfo } = data.tracks

  const loadMore = () => {
    fetchMore({
      variables: {
        page: {
          first: pageSize,
          after: pageInfo.endCursor,
        },
      },
    })
  }

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
    <ol className={'space-y-1'}>
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
          handleOnPlayClicked={() => handleOnPlayClicked(index)}
        />
      ))}
      {pageInfo.hasNextPage && nodes.length < maxSizeTopTracks && (
        <InfiniteLoader loadMore={loadMore} loadingMessage="Loading Tracks" />
      )}
    </ol>
  )
}
