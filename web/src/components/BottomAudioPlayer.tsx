import { Slider } from '@reach/slider';
import { config } from 'config';
import { useModalDispatch } from 'contexts/providers/modal';
import Hls from 'hls.js';
import { useAudioPlayerContext } from 'hooks/useAudioPlayer';
import { useMe } from 'hooks/useMe';
import { Forward } from 'icons/ForwardButton';
import { HeartBorder } from 'icons/HeartBorder';
import { HeartFull } from 'icons/HeartFull';
import { Pause } from 'icons/PauseBottomAudioPlayer';
import { Play } from 'icons/PlayBottomAudioPlayer';
import { Playlists } from 'icons/Playlists';
import { Rewind } from 'icons/RewindButton';
import { Shuffle } from 'icons/Shuffle';
import { TrackDocument, useToggleFavoriteMutation } from 'lib/graphql';
import mux from 'mux-embed';
import { useRouter } from 'next/router';
import { useEffect, useRef, useState } from 'react';
import { timeFromSecs } from 'utils/calculateTime';
import Asset from './Asset';

export const BottomAudioPlayer = () => {
  const me = useMe();
  const router = useRouter();
  const audioRef = useRef<HTMLAudioElement>(null);
  const {
    currentSong,
    isPlaying,
    duration,
    progress,
    progressFromSlider,
    hasNext,
    volume,
    isShuffleOn,
    togglePlay,
    playNext,
    playPrevious,
    toggleShuffle,
    setPlayingState,
    setDurationState,
    setProgressState,
    setProgressStateFromSlider,
  } = useAudioPlayerContext();
  const { dispatchShowAudioPlayerModal } = useModalDispatch();
  const [isFavorite, setIsFavorite] = useState(currentSong.isFavorite);
  const [toggleFavorite] = useToggleFavoriteMutation();


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

  const handleFavorite = async () => {
    if (me?.profile.id) {
      await toggleFavorite({ variables: { trackId: currentSong.trackId }, refetchQueries: [TrackDocument] });
      setIsFavorite(!isFavorite);
    } else {
      router.push('/login');
    }
  };

  if (!currentSong.src) {
    return null;
  }

  return (
    <article className="bg-black flex flex-col">
      <div className="flex justify-between">
        <div className="h-[90px] w-[90px] bg-gray-80 relative flex items-center flex-shrink-0">
          <Asset src={currentSong.art} sizes="5rem" />
        </div>
        <div className="flex-1 text-xxs leading-3 flex flex-col items-center px-3 pt-[6px] min-w-0">
          <div className='flex flex-col items-center'>
            <h2 className="text-white font-black truncate">{currentSong.title || 'Unknown title'}</h2>
            <p className="text-gray-80 font-medium truncate">{currentSong.artist || 'Unknown artist'}</p>
          </div>
          <div className='flex items-center w-full justify-between'>
            <div className='flex gap-3 flex-1 my-1'>
              <button className="rounded-full w-5 h-5 flex items-center justify-center" onClick={handleFavorite}>
                {isFavorite && <HeartFull height={14} width={14} />}
                {!isFavorite && <HeartBorder stroke='white' height={14} width={14} preserveAspectRatio='none' viewBox='0 0 24 24' />}
              </button>
              <button
                aria-label={isShuffleOn ? 'Shuffle off' : 'Shuffle on'}
                className="rounded-full w-5 h-5 flex justify-center items-center"
                onClick={toggleShuffle}
              >
                <Shuffle
                  width={14}
                  height={14}
                  stroke={isShuffleOn ? 'white' : '#808080'}
                  className={isShuffleOn ? 'drop-shadow-white' : ''}
                />
              </button>
            </div>
            <div className='flex gap-3'>
              <button
                className={'rounded-full w-5 h-5 flex justify-center items-center'}
                aria-label="Previous track"
                onClick={playPrevious}
              >
                <Rewind fill='white' height={10} width={12} className={'hover:fill-current '} />
              </button>
              <button
                className="bg-white rounded-full w-5 h-5 flex justify-center items-center hover:scale-110 active:scale-100"
                aria-label={isPlaying ? 'Pause' : 'Play'}
                onClick={togglePlay}
              >
                {isPlaying ? <Pause height={6} width={5} fill="black" /> : <Play height={6} width={5} fill="black" />}
              </button>
              <button
                className={`${
                  !hasNext && 'cursor-default'
                } rounded-full w-5 h-5 flex justify-center items-center`}
                aria-label="Next track"
                onClick={playNext}
                disabled={!hasNext}
              >
                <Forward fill='white' height={10} width={12} className={`${hasNext && 'hover:fill-current'}`} />
              </button>
            </div>
            <div className='flex flex-1 justify-end'>
              <button
                aria-label="Playlist"
                className="rounded-full w-5 h-5 flex justify-center items-center text-gray-80"
                onClick={() => dispatchShowAudioPlayerModal(true)}
              >
                <Playlists fillColor="white" />
              </button>
            </div>
          </div>
          <Slider className="bottom-audio-player w-full my-2" min={0} max={duration} value={progress} />
          <div className="flex justify-between text-xxs text-gray-80 w-full">
            <p>{timeFromSecs(progress || 0)}</p>
            <p>{timeFromSecs(duration || 0)}</p>
          </div>
        </div>
      </div>
      <audio
        ref={audioRef}
        onPlay={() => setPlayingState(true)}
        onPause={() => setPlayingState(false)}
        onTimeUpdate={handleTimeUpdate}
        onDurationChange={handleDurationChange}
        onEnded={handleEndedSong}
        className="opacity-0 h-0 w-0"
      />
    </article>
  );
};

export default BottomAudioPlayer;