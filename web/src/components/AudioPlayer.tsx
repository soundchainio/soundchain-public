import { Pause } from 'icons/Pause';
import { Play } from 'icons/Play';
import { useEffect, useState } from 'react';
import { remainingTime, timeFromSecs } from 'utils/calculateTime';

interface AudioPlayerProps {
  id: string
  url: string
  title: string
  artist?: string
  coverPhotoUrl?: string
}

export const AudioPlayer = ({ id, url, title, artist, coverPhotoUrl }: AudioPlayerProps) => {
  const [audioEl, setAudioEl] = useState<HTMLAudioElement>();
  const [playing, setPlaying] = useState<boolean>(false);
  const [playState, setPlayState] = useState<number>(0);
  const [duration, setDuration] = useState<number>();

  if (!(id && url)) { return null }

  const togglePlay = () => {
    if (playing) {
      audioEl?.pause();
      setPlaying(false);
    } else {
      audioEl?.play();
      setPlaying(true);
    }
  };

  const onSliderChange = (value: number) => {
    setPlayState(value);
    if (audioEl) {
      audioEl.currentTime = value;
    }
  };


  useEffect(() => {
    const audioElement = document.getElementById(id) as HTMLAudioElement;
    audioElement.onloadedmetadata = function () {
      setAudioEl(audioElement);
      setDuration(audioElement.duration);
    };
  }, []);

  audioEl?.addEventListener('timeupdate', () => {
    setPlayState(Math.floor(audioEl.currentTime));
  });

  audioEl?.addEventListener('ended', () => {
    setPlayState(0);
    setPlaying(false);
  });

  return (
    <div className="bg-black rounded-md p-4 flex items-center">
      {coverPhotoUrl &&
        <div style={{ maxWidth: "80px", maxHeight: "80px" }}>
          <img src={coverPhotoUrl} className="m-auto" />
        </div>
      }
      <div className="flex flex-col w-full">
        <div className="flex">
          <div className="w-12 flex items-center">
            <div className="bg-white rounded-full w-8 h-8 flex items-center m-auto" onClick={togglePlay}>
              {playing ?
                <Pause className="text-white m-auto scale-125" />
                :
                <Play className="text-white m-auto scale-125" />
              }
            </div>
          </div>
          <div className="flex flex-col">
            <div className="text-white font-bold">
              {title ? title : "Unkown Title"}
            </div>
            <div className="text-gray-80 font-bold">
              {artist ? artist : 'Unknown Artist'}
            </div>
          </div>
          <div className="text-white flex-1 text-right text-gray-80">
            {timeFromSecs(duration || 0)}
          </div>
        </div>
        <div className="text-white pl-2 flex flex-col mt-4">
          <input
            type="range"
            onChange={(e) => onSliderChange(parseInt(e.target.value))}
            max={duration}
            value={playState}
          />
          <div className="flex mt-1 text-xs">
            <div className="flex-1">{timeFromSecs(playState || 0)}</div>
            <div className="flex-1 text-right">{remainingTime(playState, duration || 0)} </div>
          </div>
        </div>
      </div>
      <audio id={id} src={url} className="opacity-0 h-0 w-0" />
    </div >
  )
}

