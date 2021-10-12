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
  play: (song: Song) => void;
  togglePlay: () => void;
  setPlayingState: (state: boolean) => void;
}

const AudioPlayerContext = createContext<AudioPlayerContextData>({} as AudioPlayerContextData);

interface AudioPlayerProviderProps {
  children: ReactNode;
}

export function AudioPlayerProvider({ children }: AudioPlayerProviderProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSong, setCurrentSong] = useState<Song>({} as Song);

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

  return (
    <AudioPlayerContext.Provider value={{ isPlaying, currentSong, play, togglePlay, setPlayingState }}>
      {children}
    </AudioPlayerContext.Provider>
  );
}

export const useAudioPlayerContext = () => useContext(AudioPlayerContext);
