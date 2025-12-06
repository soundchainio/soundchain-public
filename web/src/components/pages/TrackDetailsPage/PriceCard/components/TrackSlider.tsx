import { AudioSlider } from 'components/ui/audio-slider'
import { useAudioPlayerContext, Song } from 'hooks/useAudioPlayer'
import { Pause } from 'icons/Pause'
import { Play } from 'icons/Play'
import tw from 'tailwind-styled-components'
import { remainingTime, timeFromSecs } from 'utils/calculateTime'

interface TrackSliderProps {
  song: Song
}

export const TrackSlider = (props: TrackSliderProps) => {
  const { song } = props
  const { duration, progress, play, isPlaying, setProgressStateFromSlider } = useAudioPlayerContext()

  const onSliderChange = (value: number) => {
    setProgressStateFromSlider(value)
  }

  const onClickPlayPause = () => {
    if (!song) return

    play(song)
  }

  return (
    <Container>
      <PlayButton onClick={onClickPlayPause} aria-label={isPlaying ? 'Pause' : 'Play'}>
        {isPlaying ? (
          <Pause className="m-auto scale-150 text-white" />
        ) : (
          <Play className="m-auto scale-150 text-white" />
        )}
      </PlayButton>

      <div className="text-neutral-400">{timeFromSecs(progress || 0)}</div>
      <AudioSlider className="audio-player mx-4 w-full" min={0} max={duration} value={progress} onChange={onSliderChange} />
      <div className="text-neutral-400">{remainingTime(progress, duration || 0)} </div>
    </Container>
  )
}

const Container = tw.div`
  w-full
  items-center
  hidden
  mb-6

  xl:flex
`

const PlayButton = tw.button`
  h-10 
  w-14
  rounded-full 
  bg-white
  mr-6
`
