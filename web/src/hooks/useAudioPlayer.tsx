import { createContext, ReactNode, useContext, useState } from 'react';

type Song = {
  src: string;
  title?: string | null;
  trackId: string;
  artist?: string | null;
  art?: string | null;
};

interface AudioPlayerContextData {
  isPlaying: boolean;
  currentSong: Song;
  duration: number;
  progress: number;
  progressFromSlider: number | null;
  hasNext: boolean;
  hasPrevious: boolean;
  play: (song: Song) => void;
  isCurrentSong: (trackId: string) => boolean;
  isCurrentlyPlaying: (trackId: string) => boolean;
  togglePlay: () => void;
  setPlayingState: (state: boolean) => void;
  setProgressState: (value: number) => void;
  setDurationState: (value: number) => void;
  setProgressStateFromSlider: (value: number | null) => void;
  playlistState: (list: Song[], index: number) => void;
  playPrevious: () => void;
  playNext: () => void;
}

const AudioPlayerContext = createContext<AudioPlayerContextData>({} as AudioPlayerContextData);

interface AudioPlayerProviderProps {
  children: ReactNode;
}

export function AudioPlayerProvider({ children }: AudioPlayerProviderProps) {
  const [progress, setProgress] = useState<number>(0);
  const [progressFromSlider, setProgressFromSlider] = useState<number | null>(null);
  const [duration, setDuration] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSong, setCurrentSong] = useState<Song>({} as Song);
  const [playlist, setPlaylist] = useState<Song[]>([]);
  const [currentPlaylistIndex, setCurrentPlaylistIndex] = useState(0);

  const RESTART_TOLERANCE_TIME = 2; //2 seconds

  const play = (song: Song) => {
    if (currentSong.trackId !== song.trackId) {
      setProgressStateFromSlider(0);
      setIsPlaying(true);
      setCurrentSong(song);
    } else {
      togglePlay();
    }
  };

  const isCurrentSong = (trackId: string) => {
    return trackId === currentSong?.trackId;
  };

  const isCurrentlyPlaying = (trackId: string) => {
    return isPlaying && isCurrentSong(trackId);
  };

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const setPlayingState = (state: boolean) => {
    setIsPlaying(state);
  };

  const setProgressState = (value: number) => {
    setProgress(value);
  };

  const setProgressStateFromSlider = (value: number | null) => {
    setProgressFromSlider(value);
    if (value || value === 0) {
      setProgress(value);
    }
  };

  const setDurationState = (value: number) => {
    setDuration(value);
  };

  const playlistState = (list: Song[], index: number) => {
    setPlaylist(list);
    setCurrentPlaylistIndex(index);
    play(list[index]);
  };

  const hasPrevious = currentPlaylistIndex > 0;
  const hasNext = currentPlaylistIndex + 1 < playlist.length;

  function playPrevious() {
    if (hasPrevious && progress < RESTART_TOLERANCE_TIME) {
      const previousIndex = currentPlaylistIndex - 1;
      setCurrentPlaylistIndex(previousIndex);
      play(playlist[previousIndex]);
    } else {
      setProgressStateFromSlider(0);
    }
  }

  function playNext() {
    if (hasNext) {
      const nextIndex = currentPlaylistIndex + 1;
      setCurrentPlaylistIndex(nextIndex);
      play(playlist[nextIndex]);
    }
  }

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
        play,
        isCurrentSong,
        isCurrentlyPlaying,
        togglePlay,
        setPlayingState,
        setProgressState,
        setDurationState,
        setProgressStateFromSlider,
        playlistState,
        playPrevious,
        playNext,
      }}
    >
      {children}
    </AudioPlayerContext.Provider>
  );
}

export const useAudioPlayerContext = () => useContext(AudioPlayerContext);
