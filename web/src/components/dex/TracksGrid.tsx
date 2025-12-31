/**
 * TracksGrid - Grid layout for tracks using TrackNFTCard
 * Displays tracks as beautiful cards like the user avatar grid
 */
import { InfiniteLoader } from 'components/InfiniteLoader'
import { NoResultFound } from 'components/NoResultFound'
import { TrackNFTCard } from 'components/dex/TrackNFTCard'
import { useAudioPlayerContext } from 'hooks/useAudioPlayer'
import { SortOrder, SortTrackField, useGroupedTracksQuery, useToggleFavoriteMutation } from 'lib/graphql'
import React, { useCallback } from 'react'
import { Card } from 'components/ui/card'
import { Music } from 'lucide-react'

type Song = {
  src: string
  title?: string | null
  trackId: string
  artist?: string | null
  art?: string | null
}

interface TracksGridProps {
  profileId?: string
  pageSize?: number
}

export const TracksGrid = ({ profileId, pageSize = 20 }: TracksGridProps) => {
  const { playlistState, currentSong, isPlaying } = useAudioPlayerContext()
  const [toggleFavorite] = useToggleFavoriteMutation()

  const { data, loading, fetchMore, refetch } = useGroupedTracksQuery({
    variables: {
      filter: { profileId: profileId as string },
      sort: { field: SortTrackField.CreatedAt, order: SortOrder.Desc },
      page: { first: pageSize },
    },
  })

  const handlePlay = useCallback((index: number) => {
    if (!data?.groupedTracks.nodes) return

    const list = data.groupedTracks.nodes.map(node => ({
      trackId: node.id,
      src: node.playbackUrl,
      art: node.artworkUrl,
      title: node.title,
      artist: node.artist,
      isFavorite: node.isFavorite,
    } as Song))

    playlistState(list, index)
  }, [data, playlistState])

  const handleFavorite = useCallback(async (trackId: string) => {
    try {
      await toggleFavorite({ variables: { trackId } })
      refetch()
    } catch (error) {
      console.error('Error toggling favorite:', error)
    }
  }, [toggleFavorite, refetch])

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {[...Array(8)].map((_, i) => (
          <Card key={i} className="retro-card animate-pulse">
            <div className="aspect-square bg-gray-700 rounded-t-lg" />
            <div className="p-2 space-y-2">
              <div className="h-3 bg-gray-700 rounded w-3/4" />
              <div className="h-2 bg-gray-700 rounded w-1/2" />
            </div>
          </Card>
        ))}
      </div>
    )
  }

  if (!data?.groupedTracks.nodes.length) {
    return (
      <Card className="retro-card p-8 text-center">
        <Music className="w-12 h-12 mx-auto mb-4 text-gray-500" />
        <h3 className="text-white font-bold mb-2">No Tracks Yet</h3>
        <p className="text-gray-400 text-sm">This artist hasn't uploaded any music yet</p>
      </Card>
    )
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

  return (
    <div className="space-y-4">
      {/* Track count */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-cyan-400">{nodes.length} tracks</span>
      </div>

      {/* Grid of track cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {nodes.map((track, index) => (
          <TrackNFTCard
            key={track.id}
            track={{
              id: track.id,
              title: track.title || 'Untitled',
              artist: track.artist || 'Unknown Artist',
              artistProfileId: track.profile?.id,
              artworkUrl: track.artworkUrl || undefined,
              playbackCount: track.playbackCount || 0,
              playbackCountFormatted: track.playbackCountFormatted || '0',
              favoriteCount: track.favoriteCount || 0,
              duration: track.duration || undefined,
              genres: track.genres || [],
              isFavorite: track.isFavorite || false,
              nftData: track.tokenId ? {
                tokenId: track.tokenId,
                transactionHash: track.transactionHash || undefined,
                contractAddress: track.contractAddress || undefined,
              } : undefined,
              listingItem: track.listingItem ? {
                price: track.listingItem.price || undefined,
                pricePerItem: track.listingItem.pricePerItem || undefined,
                pricePerItemToShow: track.listingItem.pricePerItemToShow || undefined,
                acceptsOGUN: track.listingItem.acceptsOGUN || false,
              } : undefined,
            }}
            onPlay={() => handlePlay(index)}
            isPlaying={isPlaying}
            isCurrentTrack={currentSong?.trackId === track.id}
            onFavorite={() => handleFavorite(track.id)}
          />
        ))}
      </div>

      {/* Load more */}
      {pageInfo.hasNextPage && (
        <InfiniteLoader loadMore={loadMore} loadingMessage="Loading more tracks..." />
      )}
    </div>
  )
}
