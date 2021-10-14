import Slider from '@reach/slider';
import { useAudioPlayerContext } from 'hooks/useAudioPlayer';
import { Pause } from 'icons/Pause';
import { Play } from 'icons/Play';
import Image from 'next/image';
import NextLink from 'next/link';
import { remainingTime, timeFromSecs } from 'utils/calculateTime';

interface Song {
  src: string;
  title?: string | null;
  trackId: string;
  artist?: string | null;
  art?: string | null;
}

interface MiniAudioPlayerProps {
  song: Song;
}

export const MiniAudioPlayer = ({ song }: MiniAudioPlayerProps) => {
  const { art, artist, title, trackId } = song;
  const { duration, progress, play, isCurrentSong, isCurrentlyPlaying } = useAudioPlayerContext();
  const isPlaying = isCurrentlyPlaying(trackId);
  const isSameSong = isCurrentSong(trackId);

  return (
    <div className="bg-black rounded-lg p-4 items-center">
      <div className="flex items-center gap-3">
        {art && (
          <div className="h-20 w-20 relative flex items-center">
            <Image src={art} alt="" layout="fill" className="m-auto object-cover" priority />
          </div>
        )}
        <div className="flex flex-col flex-1">
          <div className="flex gap-2">
            <div className="flex items-center">
              <button className="bg-white rounded-full w-8 h-8 flex items-center" onClick={() => play(song)}>
                {isPlaying ? (
                  <Pause className="text-white m-auto scale-125" />
                ) : (
                  <Play className="text-white m-auto scale-125" />
                )}
              </button>
            </div>
            <div className="flex flex-col">
              <div className="text-white font-bold text-xs">
                {trackId && <NextLink href={`/tracks/${trackId}`}>{title ? title : 'Unknown Title'}</NextLink>}
                {!trackId && <div>{title ? title : 'Unknown Title'}</div>}
              </div>
              {artist && <div className="text-gray-80 font-bold">{artist}</div>}
            </div>
            {isSameSong && <div className="flex-1 text-right text-gray-80 text-xs">{timeFromSecs(duration || 0)}</div>}
          </div>
          <div className="post-audio-player text-white flex flex-col mt-2">
            {isSameSong ? (
              <>
                <Slider className="ml-1" min={0} max={duration} value={progress} />
                <div className="flex mt-2 text-xs text-gray-80">
                  <div className="flex-1">{timeFromSecs(progress || 0)}</div>
                  <div className="flex-1 text-right">{remainingTime(progress, duration || 0)} </div>
                </div>
              </>
            ) : (
              <>
                <Slider className="ml-1" min={0} max={1} value={0} />
                <div className="flex mt-2 text-xs text-gray-80">
                  <div className="flex-1">0:00</div>
                  <div className="flex-1 text-right" />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
