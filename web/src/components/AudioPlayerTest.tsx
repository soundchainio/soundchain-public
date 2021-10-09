import Hls from 'hls.js';
import { useAudioPlayerContext } from 'hooks/useAudioPlayer';
import { Pause } from 'icons/Pause';
import { Play } from 'icons/Play';
import Image from 'next/image';
import NextLink from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { remainingTime, timeFromSecs } from 'utils/calculateTime';

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
    <div className="bg-black rounded-md p-4 items-center">
      <div className="flex items-center">
        {song.art && (
          <div className="h-20 w-20 relative flex items-center">
            <Image src={song.art} alt="" layout="fill" className="m-auto object-cover" />
          </div>
        )}
        <div className="flex flex-col flex-1">
          <div className="flex">
            <div className="w-12 flex items-center">
              <div className="bg-white rounded-full w-8 h-8 flex items-center m-auto" onClick={togglePlay}>
                {isPlaying ? (
                  <Pause className="text-white m-auto scale-125" />
                ) : (
                  <Play className="text-white m-auto scale-125" />
                )}
              </div>
            </div>
            <div className="flex flex-col">
              <div className="text-white font-bold">
                <NextLink href={`/tracks/${song.trackId}`}>{song.title ? song.title : 'Unknown Title'}</NextLink>
              </div>
              <div className="text-gray-80 font-bold">{song.artist || 'Unknown Artist'}</div>
            </div>
            <div className="flex-1 text-right text-gray-80">{timeFromSecs(duration || 0)}</div>
          </div>
          <div className="text-white pl-2 flex flex-col mt-4">
            <input
              type="range"
              onChange={e => onSliderChange(parseInt(e.target.value))}
              max={duration}
              value={progress}
            />
            <div className="flex mt-1 text-xs">
              <div className="flex-1">{timeFromSecs(progress || 0)}</div>
              <div className="flex-1 text-right">{remainingTime(progress, duration || 0)} </div>
            </div>
          </div>
        </div>
      </div>
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
