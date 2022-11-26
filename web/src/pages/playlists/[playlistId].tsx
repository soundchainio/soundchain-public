import { GetServerSideProps } from 'next/types'
import { PageInfo, Playlist, PlaylistTrack, Profile, Track } from '../../lib/graphql'
import { cacheFor, createApolloClient } from '../../lib/apollo'
import { ApolloQueryResult } from '@apollo/client'
import tw from 'tailwind-styled-components'
import { getPlaylistData, getPlaylistTracksData, getProfileData } from 'repositories/playlist'
import { errorHandler } from 'utils/errorHandler'
import { ImageCard } from 'components/pages/Playlist/MainImage/ImageCard'
import { PlaylistTracks } from 'components/pages/Playlist/PlaylistTracks'
import { useEffect, useState } from 'react'
import { getUserPlaylists } from 'repositories/playlist/playlist'

export interface PaginateResult<T> {
  pageInfo: PageInfo
  nodes: T[]
}

export const getServerSideProps: GetServerSideProps = async context => {
  try {
    const playlistId = context.params?.playlistId

    if (!playlistId || Array.isArray(playlistId)) return { notFound: true }

    const playlistData = await getPlaylistData({ context, playlistId })

    const trackEditionIds = playlistData?.data?.playlist?.playlistTracks?.map(
      (track: PlaylistTrack) => track.trackEditionId,
    )

    const playlistTracksData = await getPlaylistTracksData({ trackEditionIds, context })

    const profileData = await getProfileData({ context, profileId: playlistData.data.playlist.profileId })

    return {
      props: { playlistData, playlistTracksData, profileData },
    }
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
  const [userPlaylists, setUserPlaylists] = useState<Playlist[] | undefined>(undefined)

  const fetchUserPlaylists = async () => {
    const userPlaylists = await getUserPlaylists()

    setUserPlaylists(userPlaylists?.data?.getUserPlaylists?.nodes)
  }

  useEffect(() => {
    fetchUserPlaylists()
  }, [])

  if (!profileData || !playlistData) return null

  return (
    <Container data-testid="playlist-container">
      <ImageCard
        profile={profileData.data.profile}
        playlist={playlistData.data.playlist}
        playlistTracks={playlistTracksData?.data.tracks.nodes}
      />
      <Card>
        {playlistTracksData && (
          <PlaylistTracks
            playlistData={playlistTracksData}
            profile={profileData.data.profile}
            playlist={playlistData.data.playlist}
            userPlaylists={userPlaylists}
          />
        )}
      </Card>
    </Container>
  )
}

const Container = tw.div`
  flex
  flex-col
  gap-4
  items-center
  w-full
  h-full
  p-4
`

const Card = tw.div`
  items-center 
  justify-center 
  rounded-xl 
  bg-neutral-800
  p-4
  w-full
  max-w-[350px]
`
