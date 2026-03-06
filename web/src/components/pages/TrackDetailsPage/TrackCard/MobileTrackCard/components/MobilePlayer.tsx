import { FavoriteTrack } from 'components/common/Buttons/FavoriteTrack/FavoriteTrack'
import { TrackShareButton } from 'components/TrackShareButton'
import { Pause } from 'icons/Pause'
import { Play } from 'icons/Play'
import { TrackQuery } from 'lib/graphql'
import Link from 'next/link'
import { Tooltip } from 'react-tooltip'
import tw from 'tailwind-styled-components'

interface MobilePlayerProps {
  handleOnPlayClicked: () => void
  isPlaying: boolean
  track: TrackQuery['track']
  classNames?: string
  hideTrackName?: boolean
  hideArtistName?: boolean
  hideLikeButton?: boolean
  playButtonStyle?: string
}

export const MobilePlayer = (props: MobilePlayerProps) => {
  const {
    classNames,
    handleOnPlayClicked,
    isPlaying,
    track,
    hideArtistName,
    hideLikeButton,
    hideTrackName,
    playButtonStyle,
  } = props

  return (
    <Container className={classNames}>
      <MobilePlayerInnerFlex>
        <span>
          <PlayButton
            className={playButtonStyle}
            onClick={handleOnPlayClicked}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="m-auto scale-125 text-white" />
            ) : (
              <Play className="m-auto scale-125 text-white" />
            )}
          </PlayButton>
          {!hideTrackName && (
            <>
              <Tooltip id="track-title-mobile" content={track.title} />
              <a data-tooltip-id="track-title-mobile">
                <TrackTitle>{track.title}</TrackTitle>
              </a>
            </>
          )}

          {!hideArtistName && (
            <Link href={`/profiles/${track.artist}` || ''} passHref>
              <ArtistName>{track.artist}</ArtistName>
            </Link>
          )}
        </span>

        {!hideLikeButton && (
          <div className="flex items-center gap-1">
            <TrackShareButton
              trackId={track.id}
              artist={track.artist}
              title={track.title}
              height={25}
              width={25}
              color="white"
            />
            <FavoriteTrack />
          </div>
        )}
      </MobilePlayerInnerFlex>
    </Container>
  )
}

const Container = tw.div`
  mobile-image-black-bottom-gradient 
  absolute 
  top-0 
  left-0 
  flex 
  h-[400px] 
  w-full 
  flex-col 
  justify-end 
  rounded-xl 
  p-4 
  text-white
`
const MobilePlayerInnerFlex = tw.div`
  flex 
  items-center 
  justify-between
`

const PlayButton = tw.button`
  mb-4 
  flex 
  h-8 
  w-8 
  items-center 
  rounded-full 
  bg-white
`

const TrackTitle = tw.h1`
  mb-2 
  text-xl 
  font-bold 
  leading-5
  max-w-[100px]
  truncate
`
const ArtistName = tw.h2`
  text-base 
  font-bold 
  leading-5 
  text-[#969899]
  max-w-[100px]
  truncate
`
