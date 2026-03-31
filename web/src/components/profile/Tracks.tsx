import classNames from 'classnames'
import { InfiniteLoader } from 'components/InfiniteLoader'
import { NoResultFound } from 'components/NoResultFound'
import { TrackListItem } from 'components/TrackListItem'
import { TrackListItemSkeleton } from 'components/TrackListItemSkeleton'
import { useAudioPlayerContext } from 'hooks/useAudioPlayer'
import { SortOrder, SortTrackField, useGroupedTracksQuery } from 'lib/graphql'
import { Disc3, Gem } from 'lucide-react'
import React, { useMemo, useState } from 'react'
import PullToRefresh from 'react-simple-pull-to-refresh'

type Song = {
  src: string
  title?: string | null
  trackId: string
  artist?: string | null
  art?: string | null
}

type TrackFilter = 'all' | 'scid' | 'nft'

interface TracksProps extends React.ComponentPropsWithoutRef<'div'> {
  profileId?: string
  pageSize?: number
}

export const Tracks = ({ className, profileId, pageSize = 10 }: TracksProps) => {
  const { playlistState } = useAudioPlayerContext()
  const [filter, setFilter] = useState<TrackFilter>('all')

  const { data, loading, fetchMore, refetch } = useGroupedTracksQuery({
    variables: {
      filter: { profileId: profileId as string },
      sort: { field: SortTrackField.CreatedAt, order: SortOrder.Desc },
      page: { first: pageSize },
    },
  })

  const allNodes = data?.groupedTracks.nodes ?? []

  const filteredNodes = useMemo(() => {
    if (filter === 'all') return allNodes
    if (filter === 'nft') return allNodes.filter(n => n.nftData?.tokenId != null)
    return allNodes.filter(n => n.nftData?.tokenId == null)
  }, [allNodes, filter])

  if (loading) {
    return (
      <div className="space-y-2">
        <TrackListItemSkeleton />
        <TrackListItemSkeleton />
        <TrackListItemSkeleton />
      </div>
    )
  }

  if (!allNodes.length) {
    return <NoResultFound type="tracks" />
  }

  const { pageInfo } = data!.groupedTracks

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
    const list = filteredNodes.map(
      node =>
        ({
          trackId: node.id,
          src: node.playbackUrl || node.assetUrl || '',
          art: node.artworkUrl,
          title: node.title,
          artist: node.artist,
          isFavorite: node.isFavorite,
        } as Song),
    )
    playlistState(list, index)
  }

  const pillClass = (active: boolean) =>
    classNames(
      'flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-all cursor-pointer',
      active
        ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400'
        : 'bg-neutral-800/60 border-neutral-700/50 text-neutral-400 hover:text-neutral-200 hover:border-neutral-600',
    )

  return (
    <PullToRefresh onRefresh={refetch} className="h-auto">
      <div className="flex items-center gap-2 mb-2 px-1">
        <button className={pillClass(filter === 'scid')} onClick={() => setFilter(filter === 'scid' ? 'all' : 'scid')}>
          <Disc3 size={12} />
          SCIDs
        </button>
        <button className={pillClass(filter === 'nft')} onClick={() => setFilter(filter === 'nft' ? 'all' : 'nft')}>
          <Gem size={12} />
          NFTs
        </button>
      </div>
      <ol className={classNames('space-y-1', className)}>
        {filteredNodes.length === 0 ? (
          <li className="text-center text-neutral-500 text-sm py-4">
            No {filter === 'scid' ? 'SCID' : 'NFT'} tracks found
          </li>
        ) : (
          filteredNodes.map((song, index) => (
            <TrackListItem
              key={song.id}
              index={index + 1}
              song={{
                trackId: song.id,
                src: song.playbackUrl || song.assetUrl || '',
                art: song.artworkUrl,
                title: song.title,
                artist: song.artist,
                playbackCount: song.playbackCountFormatted,
                isFavorite: song.isFavorite,
              }}
              handleOnPlayClicked={song => handleOnPlayClicked(song, index)}
            />
          ))
        )}
        {pageInfo.hasNextPage && <InfiniteLoader loadMore={loadMore} loadingMessage="Loading Tracks" />}
      </ol>
    </PullToRefresh>
  )
}
