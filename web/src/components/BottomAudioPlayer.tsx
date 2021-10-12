import { Slider } from '@reach/slider';
import Hls from 'hls.js';
import { useAudioPlayerContext } from 'hooks/useAudioPlayer';
import { Pause } from 'icons/PauseBottomAudioPlayer';
import { Play } from 'icons/PlayBottomAudioPlayer';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

export const BottomAudioPlayer = () => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [progress, setProgress] = useState<number>(0);
  const [duration, setDuration] = useState<number>();
  const { isPlaying, togglePlay, setPlayingState, currentSong } = useAudioPlayerContext();

  useEffect(() => {
    if (!audioRef.current || !currentSong.src) {
      return;
    }

    let hls: Hls;

    if (audioRef.current.canPlayType('application/vnd.apple.mpegurl')) {
      audioRef.current.src = currentSong.src;
    } else if (Hls.isSupported()) {
      hls = new Hls();
      hls.loadSource(currentSong.src);
      hls.attachMedia(audioRef.current);
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [currentSong.src]);

  useEffect(() => {
    if (!audioRef.current) {
      return;
    }
    if (isPlaying) {
      audioRef.current.play();
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying, currentSong]);

  const onSliderChange = (value: number) => {
    setProgress(value);
    if (audioRef.current) {
      audioRef.current.currentTime = value;
    }
  };

  function onLoadedMetadata() {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      setDuration(audioRef.current.duration);
    }
  }

  function setupProgressListener() {
    if (audioRef.current) {
      audioRef.current.addEventListener('timeupdate', () => {
        if (audioRef?.current?.currentTime) {
          setProgress(Math.floor(audioRef.current.currentTime));
        }
      });
    }
  }

  function handleEndedSong() {
    setProgress(0);
  }

  if (!currentSong.src) {
    return null;
  }

  return (
    <div className="bottom-audio-player bg-black py-2 flex flex-col gap-2">
      <div className="flex items-center gap-2 px-2">
        <div className="h-10 w-10 bg-gray-80 relative flex items-center">
          {currentSong.art && (
            <Image src={currentSong.art} alt="art cover" layout="fill" className="m-auto object-cover" />
          )}
        </div>
        <div className="text-white text-xs flex flex-col">
          <h2 className="font-black">{currentSong.title || 'Unknown title'}</h2>
          <p className="font-medium">{currentSong.artist || 'Unknown artist'}</p>
        </div>
        <button
          aria-label={isPlaying ? 'Pause' : 'Play'}
          className="h-10 w-10 flex items-center justify-center ml-auto"
          onClick={togglePlay}
        >
          {isPlaying ? <Pause /> : <Play />}
        </button>
      </div>
      <Slider min={0} max={duration} value={progress} onChange={onSliderChange} />
      <audio
        ref={audioRef}
        onPlay={() => setPlayingState(true)}
        onPause={() => setPlayingState(false)}
        onLoadedMetadata={onLoadedMetadata}
        onTimeUpdate={setupProgressListener}
        onEnded={handleEndedSong}
        className="opacity-0 h-0 w-0"
      />
    </div>
  );
};
