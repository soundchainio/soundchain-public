import { ApolloQueryResult } from '@apollo/client'
import { GridView } from 'components/GridView'
import { ListView } from 'components/ListView'
import { Track } from 'lib/graphql'
import { PaginateResult } from 'pages/playlists/[playlistId]'

interface PlaylistTracksProps {
  playlistData: ApolloQueryResult<{
    tracks: PaginateResult<Track>
  }>
  isGrid?: boolean
}

export const PlaylistTracks = (props: PlaylistTracksProps) => {
  const { playlistData, isGrid } = props

  const { data, loading } = playlistData

  const { nodes, pageInfo } = data.tracks

  const loadMore = () => {
    return
  }

  const refetch = async () => {
    return
  }

  return (
    <>
      <ListView
        loading={loading}
        hasNextPage={pageInfo.hasNextPage}
        loadMore={loadMore}
        tracks={nodes as Track[]}
        refetch={refetch}
      />
    </>
  )
}
