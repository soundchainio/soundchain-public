import Asset from 'components/Asset/Asset'
import { TrackShareButton } from 'components/TrackShareButton'
import { Pause } from 'icons/Pause'
import { Play } from 'icons/Play'
import { Playlist, Track } from 'lib/graphql'
import tw from 'tailwind-styled-components'
import { TbPlaylistX, TbPlaylistAdd } from 'react-icons/tb'
import { PlaylistFavoriteTrack } from './PlaylistFavoriteTrack'
import { useEffect, useState } from 'react'
import { MobileModal } from 'components/common/EllipsisButton/MobileModal'
import { Divider } from 'components/common'
import { Button } from 'components/common/Button'
import { useMe } from 'hooks/useMe'
import { createPlaylistTracks, getPlaylistTracks, removeTrackFromPlaylist } from 'repositories/playlist/playlist'
import { usePlaylistContext } from 'hooks/usePlaylistContext'
import { toast } from 'react-toastify'

interface TrackMenuProps {
  track: Track
  isPlaying: boolean
  handleOnPlayClicked: () => void
  setShowTrackMenu: React.Dispatch<React.SetStateAction<boolean>>
}

export const TrackMenu = (props: TrackMenuProps) => {
  const { track, isPlaying, handleOnPlayClicked, setShowTrackMenu } = props

  const { playlistTracks, setPlaylistTracks, userPlaylists, playlist } = usePlaylistContext()

  const [showMobileModal, setShowMobileModal] = useState(false)
  const [playlists, setPlaylists] = useState<Playlist[] | undefined[]>([])

  const me = useMe()
  const isMyPlaylist = userPlaylists?.some(currentPlaylist => currentPlaylist.id === playlist?.id)

  const handleAddToPlaylist = async (userPlaylistId?: string) => {
    if (!userPlaylistId || !track) return

    const createdPlaylistTrack = await createPlaylistTracks({
      playlistId: userPlaylistId,
      trackEditionIds: [track.trackEditionId || ''],
    })

    if (!createdPlaylistTrack.title) return toast.error('Could not add track to playlist.')

    return toast.success('Track added to playlist succesfully.')
  }

  const handleRemoveFromPlaylist = async () => {
    if (!playlistTracks || !playlist || !track.trackEditionId) return

    await removeTrackFromPlaylist({ playlistId: playlist.id, trackEditionIds: [track.trackEditionId] })
    const filteredTrackdata = playlistTracks.filter(trackData => trackData.id !== track.id)

    setPlaylistTracks(filteredTrackdata)
    setShowTrackMenu(false)
  }

  useEffect(() => {
    if (!me || !track.trackEditionId || !userPlaylists) return

    const fetchPlaylistTracks = async () => {
      // Fetch all user's playerlist with selected track
      const playlistsWithSelectedTrackPromises = userPlaylists.flatMap(async userPlaylist => {
        const playlistTracks = await getPlaylistTracks({
          playlistId: userPlaylist.id,
          trackEditionId: track.trackEditionId || '',
        })

        if (!playlistTracks) return

        return playlistTracks.flatMap(playlistTrack => playlistTrack.playlistId)
      })

      const [playlistsWithSelectedTrack] = await Promise.all(playlistsWithSelectedTrackPromises)

      if (!playlistsWithSelectedTrack) return

      // List of user's playlist that DOES NOT contain selected track
      const playlistsWithoutSelectedTrack = userPlaylists.filter(
        userPlaylist => !playlistsWithSelectedTrack.find(playlistId => userPlaylist.id === playlistId),
      )

      setPlaylists(playlistsWithoutSelectedTrack)
    }

    fetchPlaylistTracks()
  }, [me, track.trackEditionId, userPlaylists])

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
          <LI onClick={() => setShowMobileModal(true)}>
            <TbPlaylistAdd size={27} />
            <h3 className="ml-2">Add to playlist</h3>
          </LI>
          {isMyPlaylist && (
            <LI onClick={handleRemoveFromPlaylist}>
              <TbPlaylistX size={27} />
              <h3 className="ml-2">Delete from playlist</h3>
            </LI>
          )}
        </ul>
      </EllipsisMenu>

      <MobileModal open={showMobileModal} close={() => setShowMobileModal(false)}>
        <UserPlaylistsContainer>
          <h2 className="mb-2 text-lg font-bold text-neutral-400">Playlists</h2>
          <Divider classnames="mb-4" />
          <Button buttonType="text" color="blue" text="Create Playlist" />
          <Divider classnames="mt-4" />
          <UserPlaylists>
            {playlists &&
              playlists.map((userPlaylist, index) => {
                return (
                  <h3 key={index} className="text-md text-white" onClick={() => handleAddToPlaylist(userPlaylist?.id)}>
                    {userPlaylist?.title}
                  </h3>
                )
              })}
          </UserPlaylists>
        </UserPlaylistsContainer>
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

const TrackContainer = tw.div`
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
const UserPlaylistsContainer = tw.div`
  p-4
  min-h-[320px]
`

const UserPlaylists = tw.div`
  my-4 
  flex 
  flex-col 
  items-start
  gap-3
`
