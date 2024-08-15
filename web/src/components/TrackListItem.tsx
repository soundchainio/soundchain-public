import { Song, useAudioPlayerContext } from 'hooks/useAudioPlayer'
import { Pause } from 'icons/PauseBottomAudioPlayer'
import { Play } from 'icons/PlayBottomAudioPlayer'
import NextLink from 'next/link'

import Asset from './Asset/Asset'

interface TrackProps {
  index: number
  song: {
    src: string
    title?: string | null
    trackId: string
    artist?: string | null
    art?: string | null
    playbackCount?: string
    isFavorite?: boolean | null
  }
  variant?: 'playlist'
  handleOnPlayClicked: (song: Song) => void
}

export const TrackListItem = ({ song, index, variant, handleOnPlayClicked }: TrackProps) => {
  const { trackId, art, title, playbackCount } = song
  const { isCurrentlyPlaying } = useAudioPlayerContext()
  const isPlaying = isCurrentlyPlaying && isCurrentlyPlaying(trackId)

  return (
    <li className={`${lineStyle(variant)} ${isPlaying ? 'font-black' : 'font-semibold'}`}>
      <NextLink href={`/tracks/${trackId}`} className="flex min-w-0 flex-1 items-center gap-2">
        <p className={indexStyle(variant)}>{index}</p>
        <div className="relative flex h-10 w-10 flex-shrink-0 items-center bg-gray-80">
          <Asset src={art} sizes="2.5rem" />
        </div>
        <div className="min-w-0">
          <p className="truncate">{title}</p>
          {playbackCount && (
            <div className="flex items-center gap-1">
              <Play fill={'#808080'} width={7} height={8} />
              <p className="text-xxs text-gray-80">{playbackCount}</p>
            </div>
          )}
        </div>
      </NextLink>
      <button
        className="flex h-10 w-10 flex-shrink-0 items-center justify-center duration-75 hover:scale-125"
        aria-label={isPlaying ? 'Pause' : 'Play'}
        onClick={e => {
          e.stopPropagation()
          handleOnPlayClicked(song)
        }}
      >
        {isPlaying ? <Pause /> : <Play />}
      </button>
    </li>
  )
}

const lineStyle = (variant: TrackProps['variant']) => {
  const common =
    'flex items-center justify-between gap-2 py-2 transition duration-300 hover:bg-gray-25  text-white text-xs'
  switch (variant) {
    case 'playlist':
      return `${common} px-1 sm:pr-2 sm:pl-1`
    default:
      return `${common} px-4`
  }
}

const indexStyle = (variant: TrackProps['variant']) => {
  const common = 'flex-shrink-0'
  switch (variant) {
    case 'playlist':
      return `${common} w-3 text-left`
    default:
      return `${common} w-6 text-right`
  }
}
