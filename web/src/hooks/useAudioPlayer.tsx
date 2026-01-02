import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useApolloClient } from '@apollo/client'
import { TracksDocument, TracksQuery, SortTrackField, SortOrder } from 'lib/graphql'

export type Song = {
  src: string
  title?: string | null
  trackId: string
  artist?: string | null
  art?: string | null
  isFavorite?: boolean | null
}

type LoopMode = 'off' | 'all' | 'one'

interface AudioPlayerContextData {
  isPlaying: boolean
  isShuffleOn: boolean
  loopMode: LoopMode
  currentSong: Song
  duration: number
  progress: number
  progressFromSlider: number | null
  hasNext: boolean
  hasPrevious: boolean
  playlist: Song[]
  volume: number
  isFavorite: boolean
  play: (song: Song, fromPlaylist?: boolean) => void
  preloadTrack: (src: string, artworkUrl?: string | null) => void
  isCurrentSong: (trackId: string) => boolean
  isCurrentlyPlaying: (trackId: string) => boolean
  togglePlay: () => void
  setPlayingState: (state: boolean) => void
  setProgressState: (value: number) => void
  setDurationState: (value: number) => void
  setProgressStateFromSlider: (value: number | null) => void
  setVolume: (value: number) => void
  playlistState: (list: Song[], index: number) => void
  playPrevious: () => void
  playNext: () => void
  jumpTo: (index: number) => void
  toggleShuffle: () => void
  toggleLoop: () => void
  setPlayerFavorite: (isFavorite: boolean) => void
  setIsPlaylistOpen: (isPlaylistOpen: boolean) => void
  isPlaylistOpen: boolean
  closePlayer: () => void
}

const localStorageVolumeKey = 'SOUNDCHAIN_VOLUME'

const AudioPlayerContext = createContext<AudioPlayerContextData>({} as AudioPlayerContextData)

interface AudioPlayerProviderProps {
  children: ReactNode
}

export function AudioPlayerProvider({ children }: AudioPlayerProviderProps) {
  const apolloClient = useApolloClient()
  const [progress, setProgress] = useState<number>(0)
  const [progressFromSlider, setProgressFromSlider] = useState<number | null>(null)
  const [duration, setDuration] = useState<number>(0)
  const [volume, setVolume] = useState(0.5) // goes from 0 to 1
  const [isPlaying, setIsPlaying] = useState(false)
  const [isShuffleOn, setIsShuffleOn] = useState(false)
  const [loopMode, setLoopMode] = useState<LoopMode>('off')
  const [isPlaylistOpen, setIsPlaylistOpen] = useState(false)
  const [currentSong, setCurrentSong] = useState<Song>({} as Song)
  const [originalPlaylist, setOriginalPlaylist] = useState<Song[]>([])
  const [playlist, setPlaylist] = useState<Song[]>([])
  const [currentPlaylistIndex, setCurrentPlaylistIndex] = useState(0)
  const [isFavorite, setIsFavorite] = useState<boolean>(false)

  const RESTART_TOLERANCE_TIME = 2 //2 seconds

  // Cache for preloaded audio URLs to avoid duplicate preloads
  const preloadedUrls = useRef<Set<string>>(new Set())

  /**
   * Aggressive IPFS preloading for both audio AND artwork
   * IPFS gateways have 5-10 second initial latency - this warms the cache
   *
   * Strategy for Audio:
   * 1. Use fetch() to start downloading the first 1MB (range request)
   * 2. Add <link rel="preload"> for browser-level caching
   * 3. Use Audio element preload for full buffering
   *
   * Strategy for Artwork:
   * 1. Use fetch() to warm IPFS gateway cache
   * 2. Use Image element to preload into browser cache
   *
   * Call this when tracks become visible on screen (hover, scroll into view)
   */
  const preloadTrack = useCallback((src: string, artworkUrl?: string | null) => {
    if (typeof window === 'undefined') return

    // Preload audio
    if (src && !preloadedUrls.current.has(src)) {
      preloadedUrls.current.add(src)

      // Strategy 1: Aggressive fetch to warm IPFS gateway cache
      fetch(src, {
        method: 'GET',
        headers: { 'Range': 'bytes=0-1048576' }, // First 1MB
        mode: 'cors',
        credentials: 'omit',
      }).then(response => {
        if (response.ok || response.status === 206) {
          console.log('[Preload] Audio gateway warmed:', src.substring(0, 50) + '...')
        }
      }).catch(() => {})

      // Strategy 2: Link preload for browser optimization
      const link = document.createElement('link')
      link.rel = 'preload'
      link.as = 'audio'
      link.href = src
      link.crossOrigin = 'anonymous'
      document.head.appendChild(link)

      // Strategy 3: Hidden audio element for full buffering
      const audio = new Audio()
      audio.preload = 'auto'
      audio.crossOrigin = 'anonymous'
      audio.src = src
      audio.load()

      // Cleanup after 2 minutes
      setTimeout(() => {
        link.remove()
        audio.src = ''
        preloadedUrls.current.delete(src)
      }, 120000)
    }

    // Preload artwork (8K images from IPFS)
    if (artworkUrl && !preloadedUrls.current.has(artworkUrl)) {
      preloadedUrls.current.add(artworkUrl)

      // Fetch to warm IPFS gateway for artwork
      fetch(artworkUrl, {
        method: 'GET',
        mode: 'cors',
        credentials: 'omit',
      }).then(response => {
        if (response.ok) {
          console.log('[Preload] Artwork gateway warmed:', artworkUrl.substring(0, 50) + '...')
        }
      }).catch(() => {})

      // Image preload for browser cache
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.src = artworkUrl

      // Link preload for images
      const imgLink = document.createElement('link')
      imgLink.rel = 'preload'
      imgLink.as = 'image'
      imgLink.href = artworkUrl
      imgLink.crossOrigin = 'anonymous'
      document.head.appendChild(imgLink)

      // Cleanup after 2 minutes
      setTimeout(() => {
        imgLink.remove()
        preloadedUrls.current.delete(artworkUrl)
      }, 120000)
    }
  }, [])

  useEffect(() => {
    const storedVolume = localStorage.getItem(localStorageVolumeKey)
    if (storedVolume != null) {
      const parsedVolume = parseFloat(storedVolume)
      // Ensure volume is at least 0.1 if it was saved as 0 (prevent stuck on mute)
      setVolume(parsedVolume > 0 ? parsedVolume : 0.5)
    }
  }, [])

  // Debounce localStorage write to prevent freezing on rapid volume changes
  const volumeTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  useEffect(() => {
    if (volumeTimeoutRef.current) {
      clearTimeout(volumeTimeoutRef.current)
    }
    volumeTimeoutRef.current = setTimeout(() => {
      localStorage.setItem(localStorageVolumeKey, volume.toString())
    }, 200)
    return () => {
      if (volumeTimeoutRef.current) {
        clearTimeout(volumeTimeoutRef.current)
      }
    }
  }, [volume])

  useEffect(() => {
    isShuffleOn ? shuffle() : unShuffle()
  }, [isShuffleOn])

  const togglePlay = useCallback(() => {
    setIsPlaying(isPlaying => !isPlaying)
  }, [])

  const setProgressState = useCallback((value: number) => {
    setProgress(value)
  }, [])

  const setProgressStateFromSlider = useCallback((value: number | null) => {
    setProgressFromSlider(value)
    if (value || value === 0) {
      setProgress(value)
    }
  }, [])

  const setPlayingState = useCallback((state: boolean) => {
    setIsPlaying(state)
  }, [])

  const setDurationState = useCallback((value: number) => {
    setDuration(value)
  }, [])

  // Fetch all tracks and create a shuffled playlist
  const loadAllTracksForShuffle = useCallback(async (currentTrack: Song) => {
    try {
      const { data } = await apolloClient.query<TracksQuery>({
        query: TracksDocument,
        variables: {
          sort: { field: SortTrackField.PlaybackCount, order: SortOrder.Desc },
          page: { first: 200 }, // Load up to 200 tracks for shuffle
        },
        fetchPolicy: 'cache-first',
      })

      if (data?.tracks?.nodes) {
        const allSongs: Song[] = data.tracks.nodes.map(node => ({
          trackId: node.id,
          src: node.playbackUrl,
          art: node.artworkUrl,
          title: node.title,
          artist: node.artist,
          isFavorite: node.isFavorite,
        }))

        // Remove current song from list (we'll add it at the start)
        const otherSongs = allSongs.filter(s => s.trackId !== currentTrack.trackId)

        // Shuffle the other songs using Durstenfeld algorithm
        for (let i = otherSongs.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1))
          ;[otherSongs[i], otherSongs[j]] = [otherSongs[j], otherSongs[i]]
        }

        // Current song first, then shuffled remaining tracks
        const shuffledPlaylist = [currentTrack, ...otherSongs]

        setPlaylist(shuffledPlaylist)
        setOriginalPlaylist(shuffledPlaylist)
        setCurrentPlaylistIndex(0)
      }
    } catch (error) {
      console.error('Failed to load tracks for shuffle:', error)
    }
  }, [apolloClient])

  const play = useCallback(
    (song: Song, fromPlaylist: boolean = false) => {
      if (currentSong.trackId !== song.trackId) {
        setProgressStateFromSlider(0)
        setIsPlaying(true)
        setCurrentSong(song)
        setIsFavorite(song.isFavorite as boolean)

        // Enable shuffle by default when playing a single track (not from playlist)
        // This loads ALL tracks from the database and shuffles them
        if (!fromPlaylist && !playlist.some(p => p.trackId === song.trackId)) {
          setIsShuffleOn(true)
          loadAllTracksForShuffle(song)
        }
      } else {
        togglePlay()
      }
    },
    [currentSong, togglePlay, setProgressStateFromSlider, playlist, loadAllTracksForShuffle],
  )

  const isCurrentSong = useCallback(
    (trackId: string) => {
      return trackId === currentSong?.trackId
    },
    [currentSong],
  )

  const isCurrentlyPlaying = useCallback(
    (trackId: string) => {
      return isPlaying && isCurrentSong(trackId)
    },
    [isCurrentSong, isPlaying],
  )

  const playlistState = useCallback(
    (list: Song[], index: number) => {
      setIsShuffleOn(false)
      setPlaylist(list)
      setCurrentPlaylistIndex(index)
      play(list[index], true) // fromPlaylist = true, don't auto-enable shuffle
    },
    [play],
  )

  const hasPrevious = currentPlaylistIndex > 0
  const hasNext = currentPlaylistIndex + 1 < playlist.length

  const playPrevious = useCallback(() => {
    if (hasPrevious && progress < RESTART_TOLERANCE_TIME) {
      const previousIndex = currentPlaylistIndex - 1
      setCurrentPlaylistIndex(previousIndex)
      play(playlist[previousIndex])
    } else {
      setProgressStateFromSlider(0)
    }
  }, [currentPlaylistIndex, hasPrevious, play, playlist, progress, setProgressStateFromSlider])

  const playNext = useCallback(() => {
    if (hasNext) {
      const nextIndex = currentPlaylistIndex + 1
      setCurrentPlaylistIndex(nextIndex)
      play(playlist[nextIndex])
    }
  }, [currentPlaylistIndex, hasNext, play, playlist])

  // Auto-preload next tracks in queue for instant playback (audio + artwork)
  useEffect(() => {
    if (!playlist.length || currentPlaylistIndex < 0) return

    // Preload next 2 tracks in the queue (both audio and artwork)
    const nextTracks = playlist.slice(currentPlaylistIndex + 1, currentPlaylistIndex + 3)
    nextTracks.forEach(track => {
      if (track?.src) {
        preloadTrack(track.src, track.art)
      }
    })
  }, [currentPlaylistIndex, playlist, preloadTrack])

  const jumpTo = useCallback(
    (index: number) => {
      if (playlist.length > index + 1) {
        setCurrentPlaylistIndex(index)
        play(playlist[index])
      }
    },
    [play, playlist],
  )

  const toggleShuffle = useCallback(() => {
    setIsShuffleOn(prev => !prev)
  }, [])

  // Toggle loop mode: off -> all -> one -> off
  const toggleLoop = useCallback(() => {
    setLoopMode(prev => {
      if (prev === 'off') return 'all'
      if (prev === 'all') return 'one'
      return 'off'
    })
  }, [])

  const shuffle = useCallback(() => {
    /* Copy the current state of the queue before shuffling */
    setOriginalPlaylist([...playlist])

    const shuffledPlaylist = [...playlist]

    /* Remove the current song of the upcoming shuffled playlist. */
    const currentSongInPlaylist = shuffledPlaylist.splice(currentPlaylistIndex, 1)

    /* Randomize array in-place using Durstenfeld shuffle algorithm */
    for (let i = shuffledPlaylist.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffledPlaylist[i], shuffledPlaylist[j]] = [shuffledPlaylist[j], shuffledPlaylist[i]]
    }

    /* Set current song as first on the queue -> index = 0 */
    setCurrentPlaylistIndex(0)

    /* Add current song as first element and then add the rest of the shuffled songs */
    setPlaylist([...currentSongInPlaylist, ...shuffledPlaylist])
  }, [currentPlaylistIndex, playlist])

  const unShuffle = useCallback(() => {
    /* Give back the current song its index on the original playlist */
    setCurrentPlaylistIndex(originalPlaylist.findIndex(song => song.trackId === currentSong.trackId))

    /* Unshuffle the queue using the original playlist value */
    setPlaylist(originalPlaylist)
  }, [currentSong.trackId, originalPlaylist])

  const setPlayerFavorite = useCallback(
    (isFavorite: boolean): void => {
      setIsFavorite(isFavorite)
    },
    [setIsFavorite],
  )

  // Close the player entirely - stops playback and clears current song
  const closePlayer = useCallback(() => {
    setIsPlaying(false)
    setCurrentSong({} as Song)
    setPlaylist([])
    setOriginalPlaylist([])
    setCurrentPlaylistIndex(0)
    setProgress(0)
    setDuration(0)
    setProgressFromSlider(null)
    setIsPlaylistOpen(false)
  }, [])

  return (
    <AudioPlayerContext.Provider
      value={{
        isPlaying,
        isShuffleOn,
        loopMode,
        currentSong,
        progress,
        progressFromSlider,
        duration,
        hasNext,
        hasPrevious,
        playlist,
        volume,
        isFavorite,
        play,
        preloadTrack,
        isCurrentSong,
        isCurrentlyPlaying,
        togglePlay,
        setPlayingState,
        setProgressState,
        setDurationState,
        setProgressStateFromSlider,
        setVolume,
        playlistState,
        playPrevious,
        playNext,
        jumpTo,
        toggleShuffle,
        toggleLoop,
        setPlayerFavorite,
        setIsPlaylistOpen,
        isPlaylistOpen,
        closePlayer,
      }}
    >
      {children}
    </AudioPlayerContext.Provider>
  )
}

export const useAudioPlayerContext = () => useContext(AudioPlayerContext)
