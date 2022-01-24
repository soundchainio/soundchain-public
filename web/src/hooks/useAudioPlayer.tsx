import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';

type Song = {
  src: string;
  title?: string | null;
  trackId: string;
  artist?: string | null;
  art?: string | null;
  isFavorite?: boolean | null;
};

interface AudioPlayerContextData {
  isPlaying: boolean;
  currentSong: Song;
  duration: number;
  progress: number;
  progressFromSlider: number | null;
  hasNext: boolean;
  hasPrevious: boolean;
  playlist: Song[];
  volume: number;
  play: (song: Song) => void;
  isCurrentSong: (trackId: string) => boolean;
  isCurrentlyPlaying: (trackId: string) => boolean;
  togglePlay: () => void;
  setPlayingState: (state: boolean) => void;
  setProgressState: (value: number) => void;
  setDurationState: (value: number) => void;
  setProgressStateFromSlider: (value: number | null) => void;
  setVolume: (value: number) => void;
  playlistState: (list: Song[], index: number) => void;
  playPrevious: () => void;
  playNext: () => void;
  jumpTo: (index: number) => void;
}

const localStorageVolumeKey = 'SOUNDCHAIN_VOLUME';

const AudioPlayerContext = createContext<AudioPlayerContextData>({} as AudioPlayerContextData);

interface AudioPlayerProviderProps {
  children: ReactNode;
}

export function AudioPlayerProvider({ children }: AudioPlayerProviderProps) {
  const [progress, setProgress] = useState<number>(0);
  const [progressFromSlider, setProgressFromSlider] = useState<number | null>(null);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState(0.5); // goes from 0 to 1
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSong, setCurrentSong] = useState<Song>({} as Song);
  const [playlist, setPlaylist] = useState<Song[]>([]);
  const [currentPlaylistIndex, setCurrentPlaylistIndex] = useState(0);

  const RESTART_TOLERANCE_TIME = 2; //2 seconds

  useEffect(() => {
    const volume = localStorage.getItem(localStorageVolumeKey);
    if (volume != null) {
      setVolume(parseFloat(volume));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(localStorageVolumeKey, volume.toString());
  }, [volume]);

  const togglePlay = useCallback(() => {
    setIsPlaying(isPlaying => !isPlaying);
  }, []);

  const setProgressState = useCallback((value: number) => {
    setProgress(value);
  }, []);

  const setProgressStateFromSlider = useCallback((value: number | null) => {
    setProgressFromSlider(value);
    if (value || value === 0) {
      setProgress(value);
    }
  }, []);

  const setPlayingState = useCallback((state: boolean) => {
    setIsPlaying(state);
  }, []);

  const setDurationState = useCallback((value: number) => {
    setDuration(value);
  }, []);

  const play = useCallback(
    (song: Song) => {
      if (currentSong.trackId !== song.trackId) {
        setProgressStateFromSlider(0);
        setIsPlaying(true);
        setCurrentSong(song);
      } else {
        togglePlay();
      }
    },
    [currentSong, togglePlay, setProgressStateFromSlider],
  );

  const isCurrentSong = useCallback(
    (trackId: string) => {
      return trackId === currentSong?.trackId;
    },
    [currentSong],
  );

  const isCurrentlyPlaying = useCallback(
    (trackId: string) => {
      return isPlaying && isCurrentSong(trackId);
    },
    [isCurrentSong, isPlaying],
  );

  const playlistState = useCallback(
    (list: Song[], index: number) => {
      setPlaylist(list);
      setCurrentPlaylistIndex(index);
      play(list[index]);
    },
    [play],
  );

  const hasPrevious = currentPlaylistIndex > 0;
  const hasNext = currentPlaylistIndex + 1 < playlist.length;

  const playPrevious = useCallback(() => {
    if (hasPrevious && progress < RESTART_TOLERANCE_TIME) {
      const previousIndex = currentPlaylistIndex - 1;
      setCurrentPlaylistIndex(previousIndex);
      play(playlist[previousIndex]);
    } else {
      setProgressStateFromSlider(0);
    }
  }, [currentPlaylistIndex, hasPrevious, play, playlist, progress, setProgressStateFromSlider]);

  const playNext = useCallback(() => {
    if (hasNext) {
      const nextIndex = currentPlaylistIndex + 1;
      setCurrentPlaylistIndex(nextIndex);
      play(playlist[nextIndex]);
    }
  }, [currentPlaylistIndex, hasNext, play, playlist]);

  const jumpTo = useCallback(
    (index: number) => {
      if (playlist.length > index + 1) {
        setCurrentPlaylistIndex(index);
        play(playlist[index]);
      }
    },
    [play, playlist],
  );

  return (
    <AudioPlayerContext.Provider
      value={{
        isPlaying,
        currentSong,
        progress,
        progressFromSlider,
        duration,
        hasNext,
        hasPrevious,
        playlist,
        volume,
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
      }}
    >
      {children}
    </AudioPlayerContext.Provider>
  );
}

export const useAudioPlayerContext = () => useContext(AudioPlayerContext);
