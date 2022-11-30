import { GetServerSideProps } from 'next/types'
import { PageInfo, Playlist, PlaylistTrack, Profile, Track } from '../../lib/graphql'
import tw from 'tailwind-styled-components'
import { getPlaylistData, getPlaylistTracksData, getProfileData } from 'repositories/playlist'
import { errorHandler } from 'utils/errorHandler'
import { ImageCard } from 'components/pages/Playlist/MainImage/ImageCard'
import { PlaylistTracks } from 'components/pages/Playlist/PlaylistTracks'
import { useEffect } from 'react'
import { usePlaylistContext } from 'hooks/usePlaylistContext'

export interface PaginateResult<T> {
  pageInfo: PageInfo
  nodes: T[]
}

export const getServerSideProps: GetServerSideProps = async context => {
  try {
    const playlistId = context.params?.playlistId

    if (!playlistId || Array.isArray(playlistId)) return { notFound: true }

    const playlist = await getPlaylistData({ context, playlistId })

    if (!playlist) return { notFound: true }

    const trackEditionIds = playlist?.data?.playlist?.playlistTracks?.map(
      (track: PlaylistTrack) => track.trackEditionId,
    )

    const playlistTracks = await getPlaylistTracksData({ trackEditionIds, context })

    const profile = await getProfileData({ context, profileId: playlist.data.playlist.profileId })

    return {
      props: {
        playlistSV: playlist.data.playlist,
        profileSv: profile?.data.profile,
        playlistTracksSv: playlistTracks?.data.tracks.nodes || null,
      },
    }
  } catch (error) {
    errorHandler(error)
    return { notFound: true }
  }
}

export interface PlaylistPageProps {
  playlistSV: Playlist
  profileSv: Profile
  playlistTracksSv?: Track[] | null
}

export default function PlaylistPage({ playlistSV, profileSv, playlistTracksSv }: PlaylistPageProps) {
  const { setPlaylistInitialData, playlist } = usePlaylistContext()

  useEffect(() => {
    setPlaylistInitialData({ playlist: playlistSV, profile: profileSv, playlistTracks: playlistTracksSv || null })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!playlist) return

  return (
    <Container data-testid="playlist-container">
      <ImageCard />
      <PlaylistTracks />
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
