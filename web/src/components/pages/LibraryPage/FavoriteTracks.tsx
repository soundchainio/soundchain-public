import { Song, useAudioPlayerContext } from 'hooks/useAudioPlayer'
import { SortTrackInput, Track } from 'lib/graphql'
import { useFavoriteTracks as useFavoriteTracksQuery } from 'hooks/useFavoriteTracksDirect'  // Phase 7e — Vercel-direct
import { useEffect } from 'react'
import { SelectToApolloQuery, SortListingItem } from 'lib/apollo/sorting'
import { GridView } from 'components/common'
import { TrackListItemSkeleton } from 'components/TrackListItemSkeleton'
import { ListView } from 'components/ListView/ListView'

interface FavoriteTracksProps {
  searchTerm: string
  isGrid?: boolean
  sorting: SortListingItem
}

const pageSize = 15

export const FavoriteTracks = (props: FavoriteTracksProps) => {
  const { searchTerm, sorting, isGrid } = props

  const { playlistState } = useAudioPlayerContext()

  // Phase 7e Vercel-direct. Search applies client-side via the shim;
  // sort param dropped (endpoint always sorts newest-first for favorites).
  const { data, loading, fetchMore, refetch } = useFavoriteTracksQuery({
    first: pageSize,
    search: searchTerm,
  })

  useEffect(() => { refetch() }, [refetch, sorting, searchTerm])

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
          hasNextPage={pageInfo.hasNextPage}
          loadMore={loadMore}
          tracks={nodes as Track[]}
          refetch={refetch as () => Promise<any>}
        />
      ) : (
        <ListView
          loading={loading}
          hasNextPage={pageInfo.hasNextPage}
          loadMore={loadMore}
          tracks={nodes as Track[]}
          refetch={refetch as () => Promise<any>}
        />
      )}
    </>
  )
}
