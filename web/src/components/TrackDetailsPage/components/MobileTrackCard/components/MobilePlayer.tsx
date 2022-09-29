import tw from 'tailwind-styled-components'
import { Pause } from 'icons/Pause'
import { Play } from 'icons/Play'
import { HeartFull } from 'icons/HeartFull'
import { HeartBorder } from 'icons/HeartBorder'
import Link from 'next/link'
import { TrackQuery } from 'lib/graphql'

interface MobilePlayerProps {
  handleOnPlayClicked: () => void
  isPlaying: boolean
  handleSetFavorite: () => Promise<void>
  track: TrackQuery['track']
  isFavorite: boolean | null
}
export const MobilePlayer = (props: MobilePlayerProps) => {
  const { handleOnPlayClicked, isPlaying, handleSetFavorite, track, isFavorite } = props

  return (
    <Container>
      <MobilePlayerInnerFlex>
        <span>
          <PlayButton onClick={handleOnPlayClicked} aria-label={isPlaying ? 'Pause' : 'Play'}>
            {isPlaying ? (
              <Pause className="m-auto scale-125 text-white" />
            ) : (
              <Play className="m-auto scale-125 text-white" />
            )}
          </PlayButton>
          <TrackTitle>{track.title}</TrackTitle>
          <Link href={`/profiles/${track.artist}` || ''}>
            <a>
              <ArtistName>{track.artist}</ArtistName>
            </a>
          </Link>
        </span>

        {isFavorite ? (
          <HeartFull onClick={handleSetFavorite} className="mb-1 self-end hover:cursor-pointer" />
        ) : (
          <HeartBorder onClick={handleSetFavorite} className="mb-1 self-end hover:cursor-pointer" />
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
  sm:hidden
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
`
const ArtistName = tw.h2`
  text-base 
  font-bold 
  leading-5 
text-[#969899]
`
