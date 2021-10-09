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
  song: Song;
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
  const [song, setSong] = useState<Song>({} as Song);

  const play = (song: Song) => {
    setIsPlaying(true);
    setSong(song);
  };

  function togglePlay() {
    setIsPlaying(!isPlaying);
  }

  function setPlayingState(state: boolean) {
    setIsPlaying(state);
  }

  return (
    <AudioPlayerContext.Provider value={{ isPlaying, song, play, togglePlay, setPlayingState }}>
      {children}
    </AudioPlayerContext.Provider>
  );
}

export const useAudioPlayerContext = () => useContext(AudioPlayerContext);
