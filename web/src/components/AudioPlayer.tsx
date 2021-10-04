import Hls from 'hls.js';
import { Pause } from 'icons/Pause';
import { Play } from 'icons/Play';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { remainingTime, timeFromSecs } from 'utils/calculateTime';

interface AudioPlayerProps {
  src: string;
  title: string;
  artist?: string;
  art?: string;
}

export const AudioPlayer = ({ src, title, artist, art }: AudioPlayerProps) => {
  const [playing, setPlaying] = useState<boolean>(false);
  const [playState, setPlayState] = useState<number>(0);
  const [duration, setDuration] = useState<number>();
  const audioRef = useRef<HTMLAudioElement>(null);

  const togglePlay = () => {
    if (playing) {
      audioRef.current?.pause();
      setPlaying(false);
    } else {
      audioRef.current?.play();
      setPlaying(true);
    }
  };

  const onSliderChange = (value: number) => {
    setPlayState(value);
    if (audioRef.current) {
      audioRef.current.currentTime = value;
    }
  };

  useEffect(() => {
    let hls: Hls;

    if (audioRef.current) {
      const audio = audioRef.current;

      if (audio.canPlayType('application/vnd.apple.mpegurl')) {
        audio.src = src;
      } else if (Hls.isSupported()) {
        hls = new Hls();
        hls.loadSource(src);
        hls.attachMedia(audio);
      }

      audio.onloadedmetadata = function () {
        if (audio) setDuration(audio.duration);
      };

      audio.addEventListener('timeupdate', () => {
        if (audio) setPlayState(Math.floor(audio.currentTime));
      });

      audio.addEventListener('ended', () => {
        setPlayState(0);
        setPlaying(false);
      });
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, []);

  return (
    <div className="bg-black rounded-md p-4 flex items-center">
      {art && (
        <div style={{ maxWidth: '80px', maxHeight: '80px' }}>
          <Image src={art} className="m-auto" />
        </div>
      )}
      <div className="flex flex-col w-full">
        <div className="flex">
          <div className="w-12 flex items-center">
            <div className="bg-white rounded-full w-8 h-8 flex items-center m-auto" onClick={togglePlay}>
              {playing ? (
                <Pause className="text-white m-auto scale-125" />
              ) : (
                <Play className="text-white m-auto scale-125" />
              )}
            </div>
          </div>
          <div className="flex flex-col">
            <div className="text-white font-bold">{title ? title : 'Unknown Title'}</div>
            <div className="text-gray-80 font-bold">{artist ? artist : 'Unknown Artist'}</div>
          </div>
          <div className="flex-1 text-right text-gray-80">{timeFromSecs(duration || 0)}</div>
        </div>
        <div className="text-white pl-2 flex flex-col mt-4">
          <input
            type="range"
            onChange={e => onSliderChange(parseInt(e.target.value))}
            max={duration}
            value={playState}
          />
          <div className="flex mt-1 text-xs">
            <div className="flex-1">{timeFromSecs(playState || 0)}</div>
            <div className="flex-1 text-right">{remainingTime(playState, duration || 0)} </div>
          </div>
        </div>
      </div>
      <audio ref={audioRef} className="opacity-0 h-0 w-0" />
    </div>
  );
};
