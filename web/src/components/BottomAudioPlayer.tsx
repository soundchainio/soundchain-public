import { Slider } from '@reach/slider';
import { config } from 'config';
import { useModalDispatch } from 'contexts/providers/modal';
import Hls from 'hls.js';
import { useAudioPlayerContext } from 'hooks/useAudioPlayer';
import { useMe } from 'hooks/useMe';
import { Pause } from 'icons/PauseBottomAudioPlayer';
import { Play } from 'icons/PlayBottomAudioPlayer';
import mux from 'mux-embed';
import { useEffect, useRef } from 'react';
import Asset from './Asset';

export const BottomAudioPlayer = () => {
  const me = useMe();
  const audioRef = useRef<HTMLAudioElement>(null);
  const {
    currentSong,
    isPlaying,
    duration,
    progress,
    progressFromSlider,
    hasNext,
    volume,
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

    mux.monitor(audioRef.current, {
      debug: false,
      data: {
        env_key: config.muxData,
        viewer_user_id: me?.id ?? '',
        player_name: 'Main Player',
        player_init_time: Date.now(),
        video_id: currentSong.trackId,
        video_title: `${currentSong.artist} - ${currentSong.title}`,
        video_producer: currentSong.artist,
      },
    });

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [currentSong, me?.id]);

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

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  function handleTimeUpdate() {
    if (audioRef?.current?.currentTime) {
      setProgressState(Math.floor(audioRef.current.currentTime));
    }
  }

  function handleDurationChange() {
    if (audioRef.current && audioRef.current.duration) {
      setDurationState(audioRef.current.duration);
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
    <div className="bg-black py-2 flex flex-col gap-2">
      <div className="flex px-2 justify-between">
        <button
          className="flex items-center gap-2 flex-1 min-w-0"
          aria-label="Open audio player controls"
          onClick={() => dispatchShowAudioPlayerModal(true)}
        >
          <div className="h-10 w-10 bg-gray-80 relative flex items-center flex-shrink-0">
            <Asset src={currentSong.art} sizes="2.5rem" />
          </div>
          <div className="text-white text-xs flex flex-col items-start min-w-0">
            <h2 className="font-black truncate w-full">{currentSong.title || 'Unknown title'}</h2>
            <p className="font-medium truncate">{currentSong.artist || 'Unknown artist'}</p>
          </div>
        </button>
        <button
          aria-label={isPlaying ? 'Pause' : 'Play'}
          className="h-10 w-11 flex items-center justify-center flex-shrink-0 hover:scale-125 duration-75"
          onClick={togglePlay}
        >
          {isPlaying ? <Pause /> : <Play />}
        </button>
      </div>
      <Slider className="bottom-audio-player" min={0} max={duration} value={progress} disabled />
      <audio
        ref={audioRef}
        onPlay={() => setPlayingState(true)}
        onPause={() => setPlayingState(false)}
        onTimeUpdate={handleTimeUpdate}
        onDurationChange={handleDurationChange}
        onEnded={handleEndedSong}
        className="opacity-0 h-0 w-0"
      />
    </div>
  );
};

export default BottomAudioPlayer;
