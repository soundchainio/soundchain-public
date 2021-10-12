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
    if (audioRef.current) {
      audioRef.current.currentTime = progressFromSlider;
    }
  }, [progressFromSlider]);

  function onLoadedMetadata() {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      setDurationState(audioRef.current.duration);
    }
  }

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

  if (!currentSong.src) {
    return null;
  }

  return (
    <div className="bottom-audio-player bg-black py-2 flex flex-col gap-2">
      <div className="flex items-center gap-2 px-2 cursor-pointer">
        <div
          className="h-10 w-10 bg-gray-80 relative flex items-center"
          onClick={() => dispatchShowAudioPlayerModal(true)}
        >
          {currentSong.art && (
            <Image src={currentSong.art} alt="art cover" layout="fill" className="m-auto object-cover priority" />
          )}
        </div>
        <div className="text-white text-xs flex flex-col" onClick={() => dispatchShowAudioPlayerModal(true)}>
          <h2 className="font-black">{currentSong.title || 'Unknown title'}</h2>
          <p className="font-medium">{currentSong.artist || 'Unknown artist'}</p>
        </div>
        <div className="flex flex-1 h-full" onClick={() => dispatchShowAudioPlayerModal(true)} />
        <button
          aria-label={isPlaying ? 'Pause' : 'Play'}
          className="h-10 w-10 flex items-center justify-center"
          onClick={togglePlay}
        >
          {isPlaying ? <Pause /> : <Play />}
        </button>
      </div>
      <Slider min={0} max={duration} value={progress} disabled onClick={() => dispatchShowAudioPlayerModal(true)} />
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
