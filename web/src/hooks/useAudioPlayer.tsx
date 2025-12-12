import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react'

export type Song = {
  src: string
  title?: string | null
  trackId: string
  artist?: string | null
  art?: string | null
  isFavorite?: boolean | null
}

interface AudioPlayerContextData {
  isPlaying: boolean
  isShuffleOn: boolean
  currentSong: Song
  duration: number
  progress: number
  progressFromSlider: number | null
  hasNext: boolean
  hasPrevious: boolean
  playlist: Song[]
  volume: number
  isFavorite: boolean
  play: (song: Song) => void
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
  setPlayerFavorite: (isFavorite: boolean) => void
  setIsPlaylistOpen: (isPlaylistOpen: boolean) => void
  isPlaylistOpen: boolean
}

const localStorageVolumeKey = 'SOUNDCHAIN_VOLUME'

const AudioPlayerContext = createContext<AudioPlayerContextData>({} as AudioPlayerContextData)

interface AudioPlayerProviderProps {
  children: ReactNode
}

export function AudioPlayerProvider({ children }: AudioPlayerProviderProps) {
  const [progress, setProgress] = useState<number>(0)
  const [progressFromSlider, setProgressFromSlider] = useState<number | null>(null)
  const [duration, setDuration] = useState<number>(0)
  const [volume, setVolume] = useState(0.5) // goes from 0 to 1
  const [isPlaying, setIsPlaying] = useState(false)
  const [isShuffleOn, setIsShuffleOn] = useState(false)
  const [isPlaylistOpen, setIsPlaylistOpen] = useState(false)
  const [currentSong, setCurrentSong] = useState<Song>({} as Song)
  const [originalPlaylist, setOriginalPlaylist] = useState<Song[]>([])
  const [playlist, setPlaylist] = useState<Song[]>([])
  const [currentPlaylistIndex, setCurrentPlaylistIndex] = useState(0)
  const [isFavorite, setIsFavorite] = useState<boolean>(false)

  const RESTART_TOLERANCE_TIME = 2 //2 seconds

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

  const play = useCallback(
    (song: Song) => {
      if (currentSong.trackId !== song.trackId) {
        setProgressStateFromSlider(0)
        setIsPlaying(true)
        setCurrentSong(song)
        setIsFavorite(song.isFavorite as boolean)
      } else {
        togglePlay()
      }
    },
    [currentSong, togglePlay, setProgressStateFromSlider],
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
      play(list[index])
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

  return (
    <AudioPlayerContext.Provider
      value={{
        isPlaying,
        isShuffleOn,
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
        setPlayerFavorite,
        setIsPlaylistOpen,
        isPlaylistOpen,
      }}
    >
      {children}
    </AudioPlayerContext.Provider>
  )
}

export const useAudioPlayerContext = () => useContext(AudioPlayerContext)
