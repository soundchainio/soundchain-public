import { AudioSlider } from 'components/ui/audio-slider'
import { useAudioPlayerContext, Song } from 'hooks/useAudioPlayer'
import { Forward } from 'icons/ForwardButton'
import { Pause } from 'icons/Pause'
import { Play } from 'icons/Play'
import { Rewind } from 'icons/RewindButton'
import { Shuffle } from 'icons/Shuffle'
import { Repeat } from 'icons/Repeat'
import tw from 'tailwind-styled-components'
import { remainingTime, timeFromSecs } from 'utils/calculateTime'
import { MiniWaveform } from './MiniWaveform'

interface BotttomPlayerTrackSliderProps {
  song: Song
  hideSlider?: boolean
  hideShuffle?: boolean
  hideLoop?: boolean
  playerClassNames?: string
  showWaveform?: boolean
}

export const BotttomPlayerTrackSlider = (props: BotttomPlayerTrackSliderProps) => {
  const { song, hideSlider, hideShuffle, hideLoop, playerClassNames, showWaveform = true } = props
  const {
    duration,
    progress,
    play,
    isPlaying,
    setProgressStateFromSlider,
    playPrevious,
    hasNext,
    hasPrevious,
    playNext,
    isShuffleOn,
    toggleShuffle,
    isLoopOn,
    loopMode,
    toggleLoop,
  } = useAudioPlayerContext()

  const onSliderChange = (value: number) => {
    setProgressStateFromSlider(value)
  }

  const onClickPlayPause = () => {
    if (!song) return

    play(song)
  }

  return (
    <Container>
      <PlaySectionContainer className={playerClassNames}>
        {!hideShuffle && (
          <button
            aria-label={isShuffleOn ? 'Shuffle off' : 'Shuffle on'}
            className="flex h-10 w-10 items-center justify-center"
            onClick={toggleShuffle}
          >
            <Shuffle width={18} stroke={isShuffleOn ? 'white' : '#808080'} className="hover:stroke-white" />
          </button>
        )}
        {!hideLoop && (
          <button
            aria-label={loopMode === 'off' ? 'Loop off' : loopMode === 'all' ? 'Loop all' : 'Loop one'}
            className="flex h-10 w-10 items-center justify-center"
            onClick={toggleLoop}
          >
            <Repeat
              width={18}
              stroke={loopMode !== 'off' ? 'white' : '#808080'}
              showOne={loopMode === 'one'}
              className="hover:stroke-white"
            />
          </button>
        )}
        <RewindButton aria-label="Previous track" onClick={playPrevious} disabled={!hasPrevious}>
          <Rewind className="hover:cursor-pointer hover:fill-white active:text-gray-80" height="100%" width="100%" />
        </RewindButton>

        <PlayButton
          onClick={onClickPlayPause}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          className="flex items-center justify-center"
        >
          {isPlaying ? <Pause className="scale-150 text-white" /> : <Play className="ml-[2px] scale-150 text-white" />}
        </PlayButton>

        <ForwardButton aria-label="Next track" onClick={playNext} disabled={!hasNext}>
          <Forward className="hover:cursor-pointer hover:fill-white active:text-gray-80" height="100" width="100" />
        </ForwardButton>
      </PlaySectionContainer>

      {!hideSlider && (
        <div className="flex items-center">
          <div className="text-neutral-400 text-sm w-12 text-right">{timeFromSecs(progress || 0)}</div>
          {showWaveform ? (
            <MiniWaveform
              progress={duration > 0 ? progress / duration : 0}
              duration={duration}
              className="mx-4 w-[500px] xl:w-[700px] 2xl:w-[900px]"
              barCount={120}
              onClick={(p) => onSliderChange(p * duration)}
            />
          ) : (
            <AudioSlider
              className="audio-player mx-4 w-[300px]"
              min={0}
              max={duration}
              value={progress}
              onChange={onSliderChange}
            />
          )}
          <div className="text-neutral-400 text-sm w-12">{remainingTime(progress, duration || 0)}</div>
        </div>
      )}
    </Container>
  )
}

const Container = tw.div`
  flex
  flex-col
  items-center
`

const PlaySectionContainer = tw.div`
  flex
  items-center
  gap-3
  justify-center
`

const PlayButton = tw.button`
  h-8
  w-8
  rounded-full 
  bg-white
`

const ForwardButton = tw.button`  
  h-12
  w-[16px]
  flex
  items-center
  justify-start
`
const RewindButton = tw.button`
  h-12
  w-[16px]
  flex
  items-center
  justify-end
`
