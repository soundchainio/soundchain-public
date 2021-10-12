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
  progressFromSlider: number;
  hasNext: boolean;
  hasPrevious: boolean;
  play: (song: Song) => void;
  togglePlay: () => void;
  setPlayingState: (state: boolean) => void;
  setProgressState: (value: number) => void;
  setDurationState: (value: number) => void;
  setProgressStateFromSlider: (value: number) => void;
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
  const [progressFromSlider, setProgressFromSlider] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSong, setCurrentSong] = useState<Song>({} as Song);
  const [playlist, setPlaylist] = useState<Song[]>([]);
  const [currentPlaylistIndex, setCurrentPlaylistIndex] = useState(0);

  const play = (song: Song) => {
    if (currentSong.trackId !== song.trackId) {
      setIsPlaying(true);
      setCurrentSong(song);
    } else {
      togglePlay();
    }
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

  const setProgressStateFromSlider = (value: number) => {
    setProgressFromSlider(value);
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
    if (hasPrevious) {
      setCurrentPlaylistIndex(currentPlaylistIndex - 1);
      play(playlist[currentPlaylistIndex - 1]);
    }
  }

  function playNext() {
    if (hasNext) {
      setCurrentPlaylistIndex(currentPlaylistIndex + 1);
      play(playlist[currentPlaylistIndex + 1]);
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
