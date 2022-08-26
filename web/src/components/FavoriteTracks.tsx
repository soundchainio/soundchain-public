import classNames from 'classnames'
import { InfiniteLoader } from 'components/InfiniteLoader'
import { SortTrackInput, Track, TrackQuery, useFavoriteTracksQuery } from 'lib/graphql'
import React, { useEffect } from 'react'
import PullToRefresh from 'react-simple-pull-to-refresh'
import { NoResultFound } from './NoResultFound'
import { TrackListItemSkeleton } from './TrackListItemSkeleton'
import { GridView } from './GridView'
import { SelectToApolloQuery, SortListingItem } from '../lib/apollo/sorting'
import { Track as TrackItem } from 'components/Track'

interface FavoriteTracksProps {
  searchTerm?: string
  isGrid?: boolean
  sorting: SortListingItem
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type Song = {
  src: string
  title?: string | null
  trackId: string
  artist?: string | null
  art?: string | null
}

const pageSize = 15

export const FavoriteTracks = ({ searchTerm, isGrid, sorting }: FavoriteTracksProps) => {
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
            {nodes.map(song => (
              <TrackItem hideBadgeAndPrice={true} key={song.id} track={song as TrackQuery['track']} />
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
