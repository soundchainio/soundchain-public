import { GetServerSideProps } from 'next/types'
import { PageInfo, Playlist, PlaylistTrack, Profile, Track } from '../../lib/graphql'
import { ApolloQueryResult } from '@apollo/client'
import tw from 'tailwind-styled-components'
import { getPlaylistData, getPlaylistTracksData, getProfileData } from 'repositories/playlist'
import { errorHandler } from 'utils/errorHandler'
import { ImageCard } from 'components/pages/Playlist/MainImage/ImageCard'
import { PlaylistTracks } from 'components/pages/Playlist/PlaylistTracks'
import { useEffect, useState } from 'react'
import { getUserPlaylists } from 'repositories/playlist/playlist'
import { usePlaylistContext } from 'hooks/usePlaylistContext'

export interface PaginateResult<T> {
  pageInfo: PageInfo
  nodes: T[]
}

export const getServerSideProps: GetServerSideProps = async context => {
  try {
    const playlistId = context.params?.playlistId

    if (!playlistId || Array.isArray(playlistId)) return { notFound: true }

    const playlistDataSv = await getPlaylistData({ context, playlistId })

    if (!playlistDataSv) return { notFound: true }

    const trackEditionIds = playlistDataSv?.data?.playlist?.playlistTracks?.map(
      (track: PlaylistTrack) => track.trackEditionId,
    )

    const playlistTracksDataSv = await getPlaylistTracksData({ trackEditionIds, context })

    const profileDataSv = await getProfileData({ context, profileId: playlistDataSv.data.playlist.profileId })

    return {
      props: { playlistDataSv, playlistTracksDataSv, profileDataSv },
    }
  } catch (error) {
    errorHandler(error)
    return { notFound: true }
  }
}

export type PlaylistData = ApolloQueryResult<{ playlist: Playlist }>
export type ProfileData = ApolloQueryResult<{ profile: Profile }>
export type PlaylistTracksData = ApolloQueryResult<{ tracks: PaginateResult<Track> }>
export interface PlaylistPageProps {
  playlistDataSv: PlaylistData
  profileDataSv: ProfileData
  playlistTracksDataSv?: PlaylistTracksData
}

export default function PlaylistPage({ playlistDataSv, profileDataSv, playlistTracksDataSv }: PlaylistPageProps) {
  const [userPlaylists, setUserPlaylists] = useState<Playlist[] | undefined>(undefined)
  const [playlistData, setPlaylistData] = useState<PlaylistData>(playlistDataSv)
  const [profileData, setProfileData] = useState<ProfileData>(profileDataSv)
  const [playlistTracksData, setPlaylistTracksData] = useState<PlaylistTracksData | null>(playlistTracksDataSv || null)

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
            playlistTrackData={playlistTracksData}
            profile={profileData.data.profile}
            playlist={playlistData.data.playlist}
            userPlaylists={userPlaylists}
            setPlaylistData={setPlaylistData}
            setProfileData={setProfileData}
            setPlaylistTracksData={setPlaylistTracksData}
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
