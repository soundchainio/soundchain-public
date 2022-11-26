import Asset from 'components/Asset/Asset'
import { TrackShareButton } from 'components/TrackShareButton'
import { Pause } from 'icons/Pause'
import { Play } from 'icons/Play'
import { Playlist, Track } from 'lib/graphql'
import tw from 'tailwind-styled-components'
import { TbPlaylistX, TbPlaylistAdd } from 'react-icons/tb'
import { PlaylistFavoriteTrack } from './PlaylistFavoriteTrack'
import { useState } from 'react'
import { MobileModal } from 'components/common/EllipsisButton/MobileModal'
import { Divider } from 'components/common'
import { Button } from 'components/common/Button'

interface TrackMenuProps {
  track: Track
  isPlaying: boolean
  handleOnPlayClicked: () => void
  userPlaylists?: Playlist[]
}

export const TrackMenu = ({ track, isPlaying, handleOnPlayClicked, userPlaylists }: TrackMenuProps) => {
  const [showMobileModal, setShowMobileModal] = useState(false)

  const handleAddToPlaylist = () => {
    setShowMobileModal(!showMobileModal)
  }
  return (
    <>
      <EllipsisMenu>
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
        </TrackContainer>

        <ul className="my-6 flex flex-col items-start gap-4">
          <LI>
            <TrackShareButton
              trackId={track.id}
              artist={track.artist}
              title={track.title}
              height={25}
              width={25}
              position="bottom-left"
              color="white"
              label
            />
          </LI>
          <LI>
            <PlaylistFavoriteTrack track={track} />
            <h3 className="ml-2">Like</h3>
          </LI>
          <LI onClick={handleAddToPlaylist}>
            <TbPlaylistAdd size={27} />
            <h3 className="ml-2">Add to playlist</h3>
          </LI>
          <LI>
            <TbPlaylistX size={27} />
            <h3 className="ml-2">Delete from playlist</h3>
          </LI>
        </ul>
      </EllipsisMenu>

      <MobileModal open={showMobileModal} close={handleAddToPlaylist}>
        <UserPlaylists>
          <h2 className="mb-2 text-lg font-bold text-neutral-400">Playlists</h2>
          <Divider classnames="mb-4" />
          <Button buttonType="text" color="blue" text="Create Playlist" />
          <Divider classnames="mt-4" />
          <div className="my-4 flex flex-col items-start gap-3">
            {userPlaylists?.map((userPlaylist, index) => {
              return (
                <h3 key={index} className="text-md text-white">
                  {userPlaylist.title}
                </h3>
              )
            })}
          </div>
        </UserPlaylists>
      </MobileModal>
    </>
  )
}

const EllipsisMenu = tw.div`
  p-4
`

const LI = tw.li`
  flex 
  items-center 
  gap-2 
  font-bold 
  text-white
  w-full
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
  h-[85px] 
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
const UserPlaylists = tw.div`
  p-4
  min-h-[320px]
`
