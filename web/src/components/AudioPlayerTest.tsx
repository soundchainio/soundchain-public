import Hls from 'hls.js';
import { useAudioPlayerContext } from 'hooks/useAudioPlayer';
import { Pause } from 'icons/Pause';
import { Play } from 'icons/Play';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

export const AudioPlayerTest = () => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [progress, setProgress] = useState<number>(0);
  const [duration, setDuration] = useState<number>();
  const { isPlaying, togglePlay, setPlayingState, song } = useAudioPlayerContext();

  useEffect(() => {
    if (!audioRef.current || !song.src) {
      return;
    }

    let hls: Hls;

    if (audioRef.current.canPlayType('application/vnd.apple.mpegurl')) {
      audioRef.current.src = song.src;
    } else if (Hls.isSupported()) {
      hls = new Hls();
      hls.loadSource(song.src);
      hls.attachMedia(audioRef.current);
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [song.src]);

  useEffect(() => {
    if (!audioRef.current) {
      return;
    }
    if (isPlaying) {
      audioRef.current.play();
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying]);

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

  if (!song.src) {
    return <div className="border-2 border-red-200">NO</div>;
  }

  return (
    <div className="bg-black pt-3 px-2">
      <div className="flex items-center gap-2">
        <div className="h-10 w-10 bg-gray-80">
          {song.art && <Image src={song.art} alt="art cover" layout="fill" className="m-auto object-cover" />}
        </div>
        <div className="text-white text-xs flex flex-col">
          <h2 className="font-black">Planet Caravan</h2>
          <p className="font-medium">Black Sabbath</p>
        </div>
        <button className="h-10 w-10 flex items-center justify-center ml-auto" onClick={togglePlay}>
          {isPlaying ? <Pause /> : <Play />}
        </button>
      </div>
      <input type="range" onChange={e => onSliderChange(parseInt(e.target.value))} max={duration} value={progress} />
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
