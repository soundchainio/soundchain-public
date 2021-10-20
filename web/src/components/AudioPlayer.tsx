import Slider from '@reach/slider';
import Hls from 'hls.js';
import { Pause } from 'icons/Pause';
import { Play } from 'icons/Play';
import Image from 'next/image';
import NextLink from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { remainingTime, timeFromSecs } from 'utils/calculateTime';
import Asset from './Asset';

interface AudioPlayerProps {
  src: string;
  title?: string | null;
  trackId?: string;
  artist?: string | null;
  art?: string | null;
}

export const AudioPlayer = ({ src, title, artist, art, trackId }: AudioPlayerProps) => {
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

      if (src.startsWith('data:audio/') || audio.canPlayType('application/vnd.apple.mpegurl')) {
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
  }, [src]);

  return (
    <div className="bg-black rounded-lg p-4 items-center">
      <div className="flex items-center gap-3">
        <div className="h-20 w-20 relative flex items-center">
          {art ? <Asset src={art} /> : <Image src="/default-pictures/album-artwork.png" alt="Artwork" layout="fill" className="m-auto object-cover" priority />}
        </div>
        <div className="flex flex-col flex-1">
          <div className="flex gap-2">
            <div className="flex items-center">
              <button className="bg-white rounded-full w-8 h-8 flex items-center" onClick={togglePlay}>
                {playing ? (
                  <Pause className="text-white m-auto scale-125" />
                ) : (
                  <Play className="text-white m-auto scale-125" />
                )}
              </button>
            </div>
            <div className="flex flex-col">
              <div className="text-white font-black text-xs">
                {trackId && <NextLink href={`/tracks/${trackId}`}>{title ? title : 'Unknown Title'}</NextLink>}
                {!trackId && <div>{title ? title : 'Unknown Title'}</div>}
              </div>
              {artist && <div className="text-gray-80 text-xs font-black">{artist}</div>}
            </div>
            <div className="flex-1 text-right text-gray-80 text-xs">{timeFromSecs(duration || 0)}</div>
          </div>
          <div className="text-white flex flex-col mt-2">
            <Slider className="audio-player ml-1" min={0} max={duration} value={playState} onChange={onSliderChange} />
            <div className="flex mt-2 text-xs text-gray-80">
              <div className="flex-1">{timeFromSecs(playState || 0)}</div>
              <div className="flex-1 text-right">{remainingTime(playState, duration || 0)} </div>
            </div>
          </div>
        </div>
      </div>
      <audio ref={audioRef} className="opacity-0 h-0 w-0" />
    </div>
  );
};
