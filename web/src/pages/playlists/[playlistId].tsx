import { GetServerSideProps } from 'next/types'
import { PageInfo, Playlist, PlaylistTrack, Profile, Track } from '../../lib/graphql'
import { cacheFor, createApolloClient } from '../../lib/apollo'
import { ApolloQueryResult } from '@apollo/client'
import tw from 'tailwind-styled-components'
import { getPlaylistData, getPlaylistTracksData, getProfileData } from 'repositories/playlist'
import { errorHandler } from 'utils/errorHandler'
import { ImageCard } from 'components/pages/Playlist/Mobile/MainImage/ImageCard'

export interface PaginateResult<T> {
  pageInfo: PageInfo
  nodes: T[]
}

export const getServerSideProps: GetServerSideProps = async context => {
  try {
    const playlistId = context.params?.playlistId

    if (!playlistId || Array.isArray(playlistId)) return { notFound: true }

    const apolloClient = createApolloClient(context)

    const playlistData = await getPlaylistData({ context, playlistId })

    const trackEditionIds = playlistData?.data?.playlist?.playlistTracks?.map(
      (track: PlaylistTrack) => track.trackEditionId,
    )

    const playlistTracksData = await getPlaylistTracksData({ trackEditionIds, context })

    const profileData = await getProfileData({ context, profileId: playlistData.data.playlist.profileId })

    return cacheFor(PlaylistPage, { playlistData, playlistTracksData, profileData }, context, apolloClient)
  } catch (error) {
    errorHandler(error)
    return { notFound: true }
  }
}

export interface PlaylistPageProps {
  playlistData?: ApolloQueryResult<{ playlist: Playlist }>
  profileData?: ApolloQueryResult<{ profile: Profile }>
  playlistTracksData?: ApolloQueryResult<{ tracks: PaginateResult<Track> }> | null
}

export default function PlaylistPage({ playlistData, playlistTracksData, profileData }: PlaylistPageProps) {
  if (!profileData || !playlistData) return null

  return (
    <Container data-testid="playlist-container">
      <ImageCard
        profile={profileData.data.profile}
        playlist={playlistData.data.playlist}
        playlistTracks={playlistTracksData?.data.tracks.nodes}
      />
    </Container>
  )
}

const Container = tw.div`
  flex
  flex-col
  items-center
  w-full
  h-full
  p-4
`
