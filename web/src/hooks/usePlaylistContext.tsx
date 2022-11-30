import {
  Playlist,
  Track,
  Profile,
  useTogglePlaylistFavoriteMutation,
  useTogglePlaylistFollowMutation,
} from 'lib/graphql'
import { useRouter } from 'next/router'
import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react'
import { getUserPlaylists } from 'repositories/playlist/playlist'
import { useMe } from './useMe'

const PlaylistContext = createContext<PlaylistContextData>({} as PlaylistContextData)

interface PlaylistProviderProps {
  children: ReactNode
}

export interface PlaylistInitialData {
  playlist: Playlist
  profile: Profile
  playlistTracks: Track[] | null
}

interface PlaylistContextData {
  isFavoritePlaylist: boolean
  isFollowedPlaylist: boolean
  setFavoritePlaylist: (isFavorite: boolean) => void
  toggleFollowPlaylist: (isFavorite: boolean) => void
  setLikeCount: React.Dispatch<React.SetStateAction<number>>
  likeCount: number
  setFollowCount: React.Dispatch<React.SetStateAction<number>>
  setPlaylistTracks: React.Dispatch<React.SetStateAction<Track[] | null>>
  followCount: number
  playlist: Playlist | null
  userPlaylists: Playlist[] | null
  profile: Profile | null
  playlistTracks: Track[] | null
  togglePlaylistFavorite: unknown
  setPlaylistInitialData: (params: PlaylistInitialData) => void
}

export function PlaylistProvider({ children }: PlaylistProviderProps) {
  const [isFavoritePlaylist, setIsFavoritePlaylist] = useState(false)
  const [isFollowedPlaylist, setIsFollowedPlaylist] = useState(false)
  const [userPlaylists, setUserPlaylists] = useState<Playlist[] | null>(null)
  const [playlist, setPlaylist] = useState<Playlist | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [playlistTracks, setPlaylistTracks] = useState<Track[] | null>(null)

  const [likeCount, setLikeCount] = useState(0)
  const [followCount, setFollowCount] = useState(0)

  const router = useRouter()
  const me = useMe()

  const [togglePlaylistFavorite] = useTogglePlaylistFavoriteMutation()
  const [togglePlaylistFollowMutation] = useTogglePlaylistFollowMutation()

  const setPlaylistInitialData = (params: PlaylistInitialData) => {
    const { playlist, profile, playlistTracks } = params

    setPlaylist(playlist)
    setProfile(profile)
    setPlaylistTracks(playlistTracks || null)
  }

  const toggleFollowPlaylist = useCallback(
    async (state: boolean) => {
      if (!me) return router.push('/login')
      if (!playlist) return

      setIsFollowedPlaylist(state)

      await togglePlaylistFollowMutation({
        variables: { playlistId: playlist.id },
      })
    },
    [me, router, playlist, togglePlaylistFollowMutation],
  )

  const setFavoritePlaylist = useCallback(
    async (state: boolean) => {
      if (!me) return router.push('/login')
      if (!playlist) return

      setIsFavoritePlaylist(state)

      await togglePlaylistFavorite({
        variables: { playlistId: playlist.id },
      })
    },
    [me, router, togglePlaylistFavorite, playlist],
  )

  useEffect(() => {
    if (!playlist) return

    setIsFavoritePlaylist(playlist.isFavorite)
    setIsFollowedPlaylist(playlist.isFollowed)
    setLikeCount(playlist.favoriteCount)
    setFollowCount(playlist.followCount)
  }, [playlist, setLikeCount, setFollowCount])

  const fetchUserPlaylists = async () => {
    const userPlaylists = await getUserPlaylists()

    setUserPlaylists(userPlaylists?.data?.getUserPlaylists?.nodes || null)
  }

  useEffect(() => {
    fetchUserPlaylists()
  }, [])

  return (
    <PlaylistContext.Provider
      value={{
        isFavoritePlaylist,
        setFavoritePlaylist,
        isFollowedPlaylist,
        toggleFollowPlaylist,
        playlist,
        profile,
        userPlaylists,
        playlistTracks,
        togglePlaylistFavorite,
        likeCount,
        setLikeCount,
        followCount,
        setFollowCount,
        setPlaylistInitialData,
        setPlaylistTracks,
      }}
    >
      {children}
    </PlaylistContext.Provider>
  )
}

export const usePlaylistContext = () => useContext(PlaylistContext)
