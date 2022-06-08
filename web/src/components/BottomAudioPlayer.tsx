import { VolumeOffIcon, VolumeUpIcon } from '@heroicons/react/solid';
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
    setVolume
  } = useAudioPlayerContext();
  const { dispatchShowAudioPlayerModal } = useModalDispatch();
  const [isFavorite, setIsFavorite] = useState(currentSong.isFavorite);
  const [isMobile, setIsMobile] = useState(true);
  const [toggleFavorite] = useToggleFavoriteMutation();

  useEffect(()=> {
    let check = false;
    // eslint-disable-next-line max-len
    (function (a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0, 4))) check = true})(navigator.userAgent||navigator.vendor||window.opera)
    setIsMobile(check)
  }, [])

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

  const MobilePlayer = () => {
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
            <Slider className="bottom-audio-player w-full max-w-xl my-2" min={0} max={duration} value={progress} />
            <div className="flex justify-between text-xxs text-gray-80 w-full max-w-xl">
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
  }

  const DesktopPlayer = () => {
    return (
      <article className="bg-black flex flex-col">
        <div className='flex'>
          <div className='flex items-center gap-7 flex-1'>
            <div className="h-[90px] w-[90px] bg-gray-80 relative flex items-center flex-shrink-0">
              <Asset src={currentSong.art} sizes="5rem" />
            </div>
            <div className='flex flex-col text-xs'>
              <h2 className="text-white font-black truncate">{currentSong.title || 'Unknown title'}</h2>
              <p className="text-gray-80 font-medium truncate">{currentSong.artist || 'Unknown artist'}</p>
            </div>
            <button className="rounded-full w-5 h-5 flex items-center justify-center" onClick={handleFavorite}>
              {isFavorite && <HeartFull height={14} width={14} />}
              {!isFavorite && <HeartBorder stroke='white' height={14} width={14} preserveAspectRatio='none' viewBox='0 0 24 24' />}
            </button>
          </div>
          <div className='flex flex-col items-center justify-end flex-2'>
            <div className='flex gap-3'>
              <button
                aria-label={isShuffleOn ? 'Shuffle off' : 'Shuffle on'}
                className="rounded-full w-8 h-8 flex justify-center items-center flex-1"
                onClick={toggleShuffle}
              >
                <Shuffle
                  width={14}
                  height={14}
                  stroke={isShuffleOn ? 'white' : '#808080'}
                  className={isShuffleOn ? 'drop-shadow-white' : ''}
                />
              </button>
              <button
                className={'rounded-full w-8 h-8 flex justify-center items-center'}
                aria-label="Previous track"
                onClick={playPrevious}
              >
                <Rewind fill='white' height={10} width={12} className={'hover:fill-current '} />
              </button>
              <button
                className="bg-white rounded-full w-8 h-8 flex justify-center items-center hover:scale-110 active:scale-100"
                aria-label={isPlaying ? 'Pause' : 'Play'}
                onClick={togglePlay}
              >
                {isPlaying ? <Pause height={9} width={8} fill="black" /> : <Play height={9} width={8} fill="black" />}
              </button>
              <button
                className={`${
                  !hasNext && 'cursor-default'
                } rounded-full w-8 h-8 flex justify-center items-center`}
                aria-label="Next track"
                onClick={playNext}
                disabled={!hasNext}
              >
                <Forward fill='white' height={10} width={12} className={`${hasNext && 'hover:fill-current'}`} />
              </button>
              <div className='flex-1'/>
            </div>
            <Slider className="bottom-audio-player w-full max-w-xl my-2 mt-3" min={0} max={duration} value={progress} />
            <div className="flex justify-between text-xxs text-gray-80 w-full max-w-xl">
              <p>{timeFromSecs(progress || 0)}</p>
              <p>{timeFromSecs(duration || 0)}</p>
            </div>
          </div>
          <div className='flex flex-1 items-center justify-end'>
            <button
              aria-label="Playlist"
              className="rounded-full w-5 h-5 flex justify-center items-center text-gray-80 mr-3"
              onClick={() => dispatchShowAudioPlayerModal(true)}
            >
              <Playlists fillColor="white" />
            </button>
            <div className="hidden md:flex items-center gap-4 text-white mr-3">
              <VolumeOffIcon width={16} viewBox="-8 0 20 20" />
              <div className="flex-1">
                <Slider
                  className="volume-slider w-20"
                  min={0}
                  max={1}
                  value={volume}
                  onChange={value => setVolume(value)}
                  step={0.1}
                />
              </div>
              <VolumeUpIcon width={16} />
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
  }

  if(isMobile) {
    return <MobilePlayer/>
  }
  return <DesktopPlayer/>
};

export default BottomAudioPlayer;