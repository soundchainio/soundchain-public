import { Song, useAudioPlayerContext } from 'hooks/useAudioPlayer'
import { SortOrder, SortTrackField, useGroupedTracksQuery } from 'lib/graphql'
import { useEffect } from 'react'
import { InfiniteLoader } from 'components/InfiniteLoader'
import { NoResultFound } from './NoResultFound'
import { TrackListItem } from './TrackListItem'
import { TrackListItemSkeleton } from './TrackListItemSkeleton'

interface OwnedNftsProps {
  owner: string
  refreshing?: boolean
}

export const OwnedNfts = ({ owner, refreshing }: OwnedNftsProps) => {
  const { playlistState } = useAudioPlayerContext()

  const pageSize = 100000
  const { data, loading, fetchMore, refetch } = useGroupedTracksQuery({
    fetchPolicy: 'no-cache',
    variables: {
      filter: { nftData: { owner } },
      sort: { field: SortTrackField.CreatedAt, order: SortOrder.Desc },
      page: { first: pageSize },
    },
  })

  useEffect(() => {
    if (refreshing) {
      refetch()
    }
  }, [refreshing, refetch])

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
    return <NoResultFound type="NFTs" />
  }

  const { nodes, pageInfo } = data.groupedTracks

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
          }}
          handleOnPlayClicked={song => handleOnPlayClicked(song, index)}
        />
      ))}
      {pageInfo.hasNextPage && <InfiniteLoader loadMore={loadMore} loadingMessage="Loading Tracks" />}
    </ol>
  )
}
