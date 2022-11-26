import { ApolloQueryResult } from '@apollo/client'
import Asset from 'components/Asset/Asset'
import { Divider } from 'components/common'
import { Button } from 'components/common/Button'
import { FavoriteTrack } from 'components/common/Buttons/FavoriteTrack/FavoriteTrack'
import { EllipsisButton } from 'components/common/EllipsisButton'
import { Dropdown } from 'components/pages/LandingPage/Header/Navigation/Dropdown'
import { TrackShareButton } from 'components/TrackShareButton'
import { Pause } from 'icons/Pause'
import { Play } from 'icons/Play'
import { CurrencyType, Playlist, Profile, Track } from 'lib/graphql'
import { PaginateResult } from 'pages/playlists/[playlistId]'
import tw from 'tailwind-styled-components'
import { PlaylistTrackPlayerControls } from '../MainImage/PlaylistTrackPlayerControls'
import { TbPlaylistX, TbPlaylistAdd } from 'react-icons/tb'
import { TrackMenu } from './TrackMenu'

interface PlaylistTracksProps {
  playlistData: ApolloQueryResult<{
    tracks: PaginateResult<Track>
  }>
  isGrid?: boolean
  playlist: Playlist
  profile: Profile
  userPlaylists?: Playlist[]
}

export const PlaylistTracks = (props: PlaylistTracksProps) => {
  const { playlistData, profile, playlist, userPlaylists } = props

  const { data, loading } = playlistData

  const { nodes, pageInfo } = data.tracks

  const isPlaying = false

  const handleOnPlayClicked = () => {
    console.log('play')
  }

  return (
    <>
      {nodes.map((track, index) => (
        <Container key={index}>
          <TrackContainer>
            <TrackImage>
              <Asset src={track.artworkUrl} sizes="5.625rem" disableImageWave imageClassname="rounded-xl" />
              <PlayButton onClick={handleOnPlayClicked} aria-label={isPlaying ? 'Pause' : 'Play'}>
                {isPlaying ? (
                  <Pause className="ml-[1px] scale-125 text-white" />
                ) : (
                  <Play className="ml-[1px] scale-125 text-white" />
                )}
              </PlayButton>
            </TrackImage>

            <Details>
              <Title>{track.title}</Title>
              <ArtistName>{track.artist}</ArtistName>
            </Details>

            <EllipsisButton>
              <TrackMenu
                track={track}
                isPlaying={isPlaying}
                handleOnPlayClicked={handleOnPlayClicked}
                userPlaylists={userPlaylists}
              />
            </EllipsisButton>
          </TrackContainer>

          <Button
            color="green"
            buttonType="currency"
            currency={{ type: track.price.currency, value: track.price.value }}
          />
        </Container>
      ))}
    </>
  )
}

const Container = tw.section`
  flex
  flex-col
  items-start
  gap-4
`
const TrackContainer = tw.section`
  flex
  items-center
  gap-3
  w-full
  my-2
`

const TrackImage = tw.div`
  relative
  h-[75px] 
  w-[130px]
`
const PlayButton = tw.button`
  flex 
  h-7 
  w-7 
  items-center 
  justify-center
  rounded-full 
  bg-white
  absolute
  top-1/2 
  left-1/2 
  transform 
  -translate-x-1/2 
  -translate-y-1/2
`

const Details = tw.div`
  flex
  flex-col
  items-start
  w-full
`
const Title = tw.h2`
  text-white
  text-lg
  text-ellipsis
  overflow-hidden
  line-clamp-1
  max-w-[150px]
`
const ArtistName = tw.h3`
  text-neutral-400
  text-md
  text-ellipsis
  overflow-hidden
  line-clamp-1
  max-w-[150px]
`
