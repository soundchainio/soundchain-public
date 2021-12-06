import Slider from '@reach/slider';
import { config } from 'config';
import Hls from 'hls.js';
import { useAudioPlayerContext } from 'hooks/useAudioPlayer';
import { Info } from 'icons/Info';
import { Pause } from 'icons/Pause';
import { Play } from 'icons/Play';
import mux from 'mux-embed';
import NextLink from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { remainingTime, timeFromSecs } from 'utils/calculateTime';
import Asset from './Asset';

export interface Song {
  src: string;
  title?: string | null;
  trackId?: string;
  artist?: string | null;
  art?: string | null;
  isFavorite?: boolean | null;
}

export const AudioPlayer = ({ src, title, artist, art, trackId }: Song) => {
  const [playing, setPlaying] = useState<boolean>(false);
  const [playState, setPlayState] = useState<number>(0);
  const [duration, setDuration] = useState<number>();
  const audioRef = useRef<HTMLAudioElement>(null);
  const { isPlaying: isBottomPlayerPlaying, togglePlay: pauseBottomPlayer } = useAudioPlayerContext();

  const togglePlay = () => {
    if (playing) {
      audioRef.current?.pause();
      setPlaying(false);
    } else {
      isBottomPlayerPlaying && pauseBottomPlayer();
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

      const initTime = Date.now();
      mux.monitor(audioRef.current, {
        debug: false,
        data: {
          env_key: config.muxData,
          player_name: 'Embedded Player',
          player_init_time: initTime,
          video_id: trackId,
          video_title: `${artist} - ${title}`,
          video_producer: artist,
        },
      });

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
          <Asset src={art} />
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
            <NextLink href={trackId ? `/tracks/${trackId}` : '#'}>
              <div className={`flex w-full ${trackId && 'cursor-pointer'}`}>
                <div>
                  <div className="text-white font-black text-xs">
                    <div>{title ? title : 'Unknown Title'}</div>
                  </div>
                  {artist && <div className="text-gray-80 text-xs font-black">{artist}</div>}
                </div>
                {trackId && (
                  <div className="ml-auto">
                    <Info />
                  </div>
                )}
              </div>
            </NextLink>
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
