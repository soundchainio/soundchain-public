import { Slider } from '@reach/slider';
import { useModalDispatch } from 'contexts/providers/modal';
import Hls from 'hls.js';
import { useAudioPlayerContext } from 'hooks/useAudioPlayer';
import { Pause } from 'icons/PauseBottomAudioPlayer';
import { Play } from 'icons/PlayBottomAudioPlayer';
import Image from 'next/image';
import { useEffect, useRef } from 'react';

export const BottomAudioPlayer = () => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const {
    currentSong,
    isPlaying,
    duration,
    progress,
    progressFromSlider,
    hasNext,
    togglePlay,
    playNext,
    setPlayingState,
    setDurationState,
    setProgressState,
    setProgressStateFromSlider,
  } = useAudioPlayerContext();
  const { dispatchShowAudioPlayerModal } = useModalDispatch();

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

  useEffect(() => {
    if (audioRef.current && (progressFromSlider || progressFromSlider === 0)) {
      audioRef.current.currentTime = progressFromSlider;
      setProgressStateFromSlider(null);
    }
  }, [progressFromSlider, setProgressStateFromSlider]);

  function setupProgressListener() {
    if (audioRef.current) {
      audioRef.current.addEventListener('timeupdate', () => {
        if (audioRef?.current?.currentTime) {
          setProgressState(Math.floor(audioRef.current.currentTime));
        }
      });
    }
  }

  function handleEndedSong() {
    if (hasNext) {
      playNext();
    } else {
      setProgressState(0);
    }
  }

  if (audioRef.current) {
    setDurationState(audioRef.current.duration);
  }

  if (!currentSong.src) {
    return null;
  }

  return (
    <div className="bottom-audio-player bg-black py-2 flex flex-col gap-2">
      <div className="flex px-2">
        <button
          className="flex flex-1 items-center gap-2 cursor-pointer"
          aria-label="Open audio player controls"
          onClick={() => dispatchShowAudioPlayerModal(true)}
        >
          <div className="h-10 w-10 bg-gray-80 relative flex items-center">
            {currentSong.art && (
              <Image src={currentSong.art} alt="art cover" layout="fill" className="m-auto object-cover priority" />
            )}
          </div>
          <div className="text-white text-xs flex flex-col flex-1 items-start">
            <h2 className="font-black">{currentSong.title || 'Unknown title'}</h2>
            <p className="font-medium">{currentSong.artist || 'Unknown artist'}</p>
          </div>
        </button>
        <button
          aria-label={isPlaying ? 'Pause' : 'Play'}
          className="h-10 w-11 flex items-center justify-center hover:scale-125 duration-75"
          onClick={togglePlay}
        >
          {isPlaying ? <Pause /> : <Play />}
        </button>
      </div>
      <Slider min={0} max={duration} value={progress} disabled />
      <audio
        ref={audioRef}
        onPlay={() => setPlayingState(true)}
        onPause={() => setPlayingState(false)}
        onTimeUpdate={setupProgressListener}
        onEnded={handleEndedSong}
        className="opacity-0 h-0 w-0"
      />
    </div>
  );
};
