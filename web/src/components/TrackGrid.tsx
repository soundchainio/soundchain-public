import { LoaderAnimation } from 'components/LoaderAnimation'
import { useAudioPlayerContext } from 'hooks/useAudioPlayer'
import { HeartFilled } from 'icons/HeartFilled'
import { Matic } from 'icons/Matic'
import { Pause } from 'icons/Pause'
import { Play } from 'icons/Play'
import { ListingItemWithPrice, Maybe, Track, TrackWithListingItem, useMaticUsdQuery } from 'lib/graphql'
import dynamic from 'next/dynamic'
import NextLink from 'next/link'
import { useEffect, useState } from 'react'
import { currency, limitTextToNumberOfCharacters } from 'utils/format'
import { Cards } from '../icons/Cards'
import { Logo } from '../icons/Logo'
import { CurrencyType } from '../types/CurrenctyType'
import Asset from './Asset'

const WavesurferComponent = dynamic(() => import('./wavesurfer'), {
  ssr: false,
})
interface TrackProps {
  track: TrackWithListingItem | Track
  coverPhotoUrl?: string
  handleOnPlayClicked?: () => void
}

const getSaleType = (res: Maybe<ListingItemWithPrice>): string => {
  if (res?.endingTime) {
    return 'auction'
  } else if (res?.pricePerItem) {
    return 'buy now'
  }
  return ''
}

export const TrackGrid = ({ track, handleOnPlayClicked }: TrackProps) => {
  const song = {
    src: track.playbackUrl,
    trackId: track.id,
    art: track.artworkUrl || undefined,
    title: track.title,
    artist: track.artist,
    isFavorite: track.isFavorite,
    playbackCount: track.playbackCountFormatted,
    favoriteCount: track.favoriteCount,
    url: track.assetUrl,
    editionSize: track.editionSize,
    listingCount: track.listingCount,
  }

  let listingItem: Maybe<ListingItemWithPrice> = null

  if (track.__typename === 'TrackWithListingItem') {
    listingItem = (track as TrackWithListingItem).listingItem
  }

  const saleType = getSaleType(listingItem)
  const price = listingItem?.priceToShow ?? 0
  const OGUNPrice = listingItem?.OGUNPricePerItemToShow ?? 0
  const selectedCurrency: CurrencyType = price ? 'MATIC' : 'OGUN'
  const { art, artist, title, trackId, playbackCount, favoriteCount, editionSize, listingCount } = song
  const { isCurrentSong, isCurrentlyPlaying, setProgressStateFromSlider, progress } = useAudioPlayerContext()

  const [isPlaying, setIsPlaying] = useState(false)
  const [isReady, setIsReady] = useState(false)

  const { data: maticUsd } = useMaticUsdQuery()

  useEffect(() => {
    setIsPlaying(isCurrentlyPlaying(trackId))
  }, [isCurrentSong, isCurrentlyPlaying, setIsPlaying, trackId])

  const trackPrice = track.price.value

  const onTrackClick = () => {
    if (handleOnPlayClicked) handleOnPlayClicked()
  }

  return (
    <div className={`rounded-lg bg-transparent p-0.5 hover:bg-rainbow-gradient ${isPlaying && 'bg-rainbow-gradient'}`}>
      <div className="flex w-[300px] flex-col rounded-lg bg-black text-white sm:w-full">
        <NextLink href={`/tracks/${trackId}`}>
          <a>
            <div className="h-[300px] overflow-hidden rounded-t-xl sm:h-[225px]">
              <Asset src={art} />
            </div>
          </a>
        </NextLink>

        <div className="my-3 flex flex-col content-center items-center decoration-gray-80">
          <NextLink href={`/tracks/${trackId}`}>
            <a>
              <div className="mx-4 mb-2 text-sm font-bold" title={title || ''}>
                {limitTextToNumberOfCharacters(title ? title : 'Unknown Title', 20)}
              </div>
            </a>
          </NextLink>
          <NextLink href={`/profiles/${artist}`}>
            <a>
              <div className="text-center text-sm font-bold text-gray-80 hover:text-gray-400" title={artist || ''}>
                {artist ? artist : 'Unknown'}
              </div>
            </a>
          </NextLink>
        </div>
        <div className="mx-2">
          <WavesurferComponent
            setIsReady={setIsReady}
            url={song.url}
            isPlaying={isPlaying}
            setProgressStateFromSlider={setProgressStateFromSlider}
            progress={progress}
          />
        </div>
        <div>
          {saleType && (
            <div className="mx-3 mt-3 flex items-start justify-between">
              <div className="flex flex-col items-start justify-start">
                <div className="flex items-center">
                  <div className="mr-1.5 mt-1 font-semibold">
                    {selectedCurrency === 'MATIC' ? trackPrice : OGUNPrice}
                  </div>
                  {selectedCurrency === 'MATIC' ? (
                    <Matic height="20" width="23" className="" />
                  ) : (
                    <Logo height="20" width="23" className="" />
                  )}
                </div>

                {trackPrice > 0 && (
                  <div className="mt-0.5 text-xs font-semibold text-gray-80">
                    {selectedCurrency === 'MATIC' ? (
                      maticUsd &&
                      maticUsd.maticUsd &&
                      trackPrice &&
                      `${currency(trackPrice * parseFloat(maticUsd.maticUsd))}`
                    ) : (
                      <>
                        <br />
                      </>
                    )}
                  </div>
                )}
              </div>
              <div className="flex flex-col items-end justify-start">
                <div
                  className={`${
                    saleType === 'auction' ? 'auction-gradient' : 'buy-now-gradient'
                  } sale-type-font-size text-sm font-bold`}
                >
                  {saleType.toUpperCase()}
                </div>
                {editionSize > 0 && (
                  <div className="flex items-center justify-between gap-2 text-xs font-black text-gray-80">
                    <Cards width={14} height={14} />
                    {listingCount > 0 && (
                      <>
                        {listingCount}
                        {' / '}
                      </>
                    )}
                    {editionSize}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        <div className="m-4 flex items-center justify-between">
          {!isReady ? (
            <LoaderAnimation ring />
          ) : (
            <button className="flex h-6 w-6 items-center rounded-full bg-white" onClick={onTrackClick}>
              {isPlaying ? <Pause className="m-auto scale-125 text-white" /> : <Play className="m-auto text-white" />}
            </button>
          )}

          <div className="my-2 flex items-center gap-1 pt-1 text-xs font-medium text-gray-80">
            <Play fill="#808080" />
            <span>{playbackCount || 0}</span>
            <HeartFilled />
            <span className="flex-1">{favoriteCount || 0}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
