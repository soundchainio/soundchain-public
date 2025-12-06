import { useEffect, useState } from 'react'

import { useAudioPlayerContext } from 'hooks/useAudioPlayer'
import { Cards } from 'icons/Cards'
import { HeartFilled } from 'icons/HeartFilled'
import { Pause } from 'icons/Pause'
import { Play } from 'icons/Play'
import Link from 'next/link'
import { remainingTime, timeFromSecs } from 'utils/calculateTime'

import { AudioSlider } from 'components/ui/audio-slider'

import { TrackPrice } from '../lib/graphql'
import Asset from './Asset/Asset'
import { PriceDisplay } from './PriceDisplay'

interface Song {
  src: string
  title?: string | null
  trackId: string
  artist?: string | null
  art?: string | null
  isFavorite: boolean | null
  playbackCount: string
  favoriteCount: number
  listingCount?: number
  saleType: string
  price: TrackPrice
  editionSize?: number
}

interface MiniAudioPlayerProps {
  song: Song
  hideBadgeAndPrice?: boolean
  handleOnPlayClicked?: () => void
}

export const MiniAudioPlayer = (props: MiniAudioPlayerProps) => {
  const {
    art,
    artist,
    title,
    trackId,
    playbackCount,
    favoriteCount,
    saleType,
    price,
    editionSize = 0,
    listingCount,
  } = props.song
  const { hideBadgeAndPrice, handleOnPlayClicked } = props

  const { duration, progress, isCurrentSong, isCurrentlyPlaying, setProgressStateFromSlider } = useAudioPlayerContext()

  const [isPlaying, setIsPlaying] = useState(false)
  const [isSameSong, setIsSameSong] = useState(false)

  useEffect(() => {
    setIsPlaying(isCurrentlyPlaying(trackId))
    setIsSameSong(isCurrentSong(trackId))
  }, [isCurrentSong, isCurrentlyPlaying, setIsPlaying, setIsSameSong, trackId])

  const onSliderChange = (value: number) => {
    setProgressStateFromSlider(value)
  }

  const RenderTrackCounters = () => (
    <div className="flex items-center gap-1 text-xs text-gray-80">
      <Play fill="#808080" />
      <span>{playbackCount || 0}</span>
      <HeartFilled />
      <span>{favoriteCount || 0}</span>
    </div>
  )

  const onClickPlayPause = () => {
    if (handleOnPlayClicked) handleOnPlayClicked()
  }

  return (
    <div
      className={`transparent-border-1px items-center rounded-lg bg-black p-4 ${
        isPlaying ? 'gradient-track-box' : 'bg-black'
      } hover:gradient-track-box`}
    >
      <div className="flex items-center gap-3">
        <div className="relative flex h-20 w-20 items-center">
          <Asset src={art} sizes="5rem" />
        </div>
        <div className="flex flex-1 flex-col truncate">
          <div className={`flex items-start gap-2 ${hideBadgeAndPrice && 'mb-[10px]'}`}>
            <div className="flex items-center">
              <button
                className="flex h-8 w-8 items-center rounded-full bg-white"
                onClick={onClickPlayPause}
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <Pause className="m-auto scale-125 text-white" />
                ) : (
                  <Play className="m-auto scale-125 text-white" />
                )}
              </button>
            </div>
            <Link href={`/tracks/${trackId}`} className="flex w-full flex-col gap-0.5 truncate " passHref>
              <div className="flex w-full items-start justify-between gap-0.5 truncate text-xs font-black text-white">
                <p className="truncate" title={title || ''}>
                  {title ? title : 'Unknown Title'}
                </p>
                {/* <div className="flex shrink-0 flex-col items-end justify-center gap-1">
                    {saleType && saleType !== '' && !hideBadgeAndPrice && <BadgeTrack label={saleType.toUpperCase()} />}
                  </div> */}
              </div>
              <div className="flex w-full items-start justify-between gap-0.5 truncate text-xs font-black text-white">
                {artist && (
                  <p className="truncate text-xs font-black text-gray-80" title={artist}>
                    {artist}
                  </p>
                )}
                {saleType && saleType !== '' && !hideBadgeAndPrice && editionSize > 0 && (
                  <p className="flex shrink-0 items-center justify-between gap-2 text-xs font-black text-gray-80">
                    <Cards width={14} height={14} />
                    {listingCount && listingCount > 0 && `${listingCount} / `}
                    {editionSize}
                  </p>
                )}
              </div>
            </Link>
          </div>
          <div className="mt-2 flex justify-between">
            <RenderTrackCounters />
            {saleType && saleType !== '' && !hideBadgeAndPrice && price && (
              <>
                <PriceDisplay price={price} className="ml-auto text-xs" variant="currency" showBonus />
              </>
            )}
          </div>

          <div className="mt-2 flex flex-col text-white">
            {isSameSong ? (
              <>
                <AudioSlider
                  className="audio-player ml-1"
                  min={0}
                  max={duration}
                  value={progress}
                  onChange={onSliderChange}
                />
                <div className="mt-2 flex text-xs text-gray-80">
                  <div className="flex-1">{timeFromSecs(progress || 0)}</div>
                  <div className="flex-1 text-right">{remainingTime(progress, duration || 0)} </div>
                </div>
              </>
            ) : (
              <>
                <AudioSlider className="audio-player ml-1" min={0} max={1} value={0} />
                <div className="mt-2 flex text-xs text-gray-80">
                  <div className="flex-1">0:00</div>
                  <div className="flex-1 text-right" />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
