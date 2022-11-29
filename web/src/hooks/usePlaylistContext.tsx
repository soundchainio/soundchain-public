import {
  Playlist,
  usePlaylistLazyQuery,
  useTogglePlaylistFavoriteMutation,
  useTogglePlaylistFollowMutation,
} from 'lib/graphql'
import { useRouter } from 'next/router'
import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react'
import { errorHandler } from 'utils/errorHandler'
import { useMe } from './useMe'

interface PlaylistContextData {
  isFavoritePlaylist: boolean
  isFetchingPlaylist: boolean
  isFollowedPlaylist: boolean
  setFavoritePlaylist: (isFavorite: boolean) => void
  toggleFollowPlaylist: (isFavorite: boolean) => void
  setLikeCount: React.Dispatch<React.SetStateAction<number>>
  likeCount: number
  setFollowCount: React.Dispatch<React.SetStateAction<number>>
  followCount: number
  playlist?: Playlist
  togglePlaylistFavorite: any
}

const PlaylistContext = createContext<PlaylistContextData>({} as PlaylistContextData)

interface PlaylistProviderProps {
  children: ReactNode
}

export function PlaylistProvider({ children }: PlaylistProviderProps) {
  const [isFetchingPlaylist, setIsFetchingPlaylist] = useState(false)
  const [isFavoritePlaylist, setIsFavoritePlaylist] = useState(false)
  const [isFollowedPlaylist, setIsFollowedPlaylist] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [followCount, setFollowCount] = useState(0)

  const router = useRouter()
  const me = useMe()

  const [togglePlaylistFavorite] = useTogglePlaylistFavoriteMutation()
  const [togglePlaylistFollowMutation] = useTogglePlaylistFollowMutation()

  const [playlistQuery, { data: playlistData }] = usePlaylistLazyQuery()

  const toggleFollowPlaylist = useCallback(
    async (state: boolean) => {
      if (!me) return router.push('/login')
      if (!playlistData) return

      setIsFollowedPlaylist(state)

      await togglePlaylistFollowMutation({
        variables: { playlistId: playlistData.playlist.id },
      })
    },
    [me, router, playlistData, togglePlaylistFollowMutation],
  )

  const setFavoritePlaylist = useCallback(
    async (state: boolean) => {
      if (!me) return router.push('/login')
      if (!playlistData) return

      setIsFavoritePlaylist(state)

      await togglePlaylistFavorite({
        variables: { playlistId: playlistData.playlist.id },
      })
    },
    [me, router, togglePlaylistFavorite, playlistData],
  )

  useEffect(() => {
    if (!playlistData) return

    setIsFavoritePlaylist(playlistData.playlist.isFavorite)
    setIsFollowedPlaylist(playlistData.playlist.isFollowed)
    setLikeCount(playlistData.playlist.favoriteCount)
    setFollowCount(playlistData.playlist.followCount)
  }, [playlistData, setLikeCount, setFollowCount])

  useEffect(() => {
    if (!router.query.playlistId) return

    const fetchPlaylist = async () => {
      try {
        setIsFetchingPlaylist(true)
        await playlistQuery({
          variables: {
            id: router.query.playlistId as string,
          },
        })
      } catch (error) {
        errorHandler(error)
      } finally {
        setIsFetchingPlaylist(false)
      }
    }

    fetchPlaylist()
  }, [router.query.id, playlistQuery, router.query.playlistId])

  return (
    <PlaylistContext.Provider
      value={{
        isFavoritePlaylist,
        setFavoritePlaylist,
        isFollowedPlaylist,
        toggleFollowPlaylist,
        isFetchingPlaylist,
        playlist: playlistData?.playlist,
        togglePlaylistFavorite,
        likeCount,
        setLikeCount,
        followCount,
        setFollowCount,
      }}
    >
      {children}
    </PlaylistContext.Provider>
  )
}

export const usePlaylistContext = () => useContext(PlaylistContext)
