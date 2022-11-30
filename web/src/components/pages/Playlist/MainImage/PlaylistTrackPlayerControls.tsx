import tw from 'tailwind-styled-components'
import { Pause } from 'icons/Pause'
import { Play } from 'icons/Play'
import Link from 'next/link'
import { Playlist, Profile } from 'lib/graphql'
import { TrackShareButton } from 'components/TrackShareButton'
import ReactTooltip from 'react-tooltip'
import { FavoritePlaylistButton } from '../FavoritePlaylistButton/FavoritePlaylistButton'
import { useEffect, useState } from 'react'

interface Props {
  handleOnPlayClicked: () => void
  isPlaying: boolean
  profile: Profile | null
  playlist: Playlist
  classNames?: string
  hideTrackName?: boolean
  hideArtistName?: boolean
  hideLikeButton?: boolean
  playButtonStyle?: string
}

export const PlaylistTrackPlayerControls = (props: Props) => {
  const {
    handleOnPlayClicked,
    isPlaying,
    profile,
    playlist,
    hideArtistName,
    hideLikeButton,
    hideTrackName,
    playButtonStyle,
  } = props

  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  return (
    <Container>
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

          {!hideTrackName && isMounted && (
            <>
              <ReactTooltip id="playlist-title-mobile" type="dark" effect="solid">
                <span>{playlist.title}</span>
              </ReactTooltip>
              <a data-tip data-for="playlist-title-mobile">
                <TrackTitle>{playlist.title}</TrackTitle>
              </a>
            </>
          )}

          {!hideArtistName && profile && (
            <Link href={`/profiles/${profile.displayName}`}>
              <a>
                <ArtistName>{profile.displayName}</ArtistName>
              </a>
            </Link>
          )}
        </span>

        {!hideLikeButton && (
          <div className="flex items-center gap-1">
            <FavoritePlaylistButton />
            <TrackShareButton
              trackId={playlist.id}
              artist={profile.displayName}
              title={playlist.title}
              height={25}
              width={25}
              color="white"
            />
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
