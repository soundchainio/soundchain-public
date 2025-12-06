import tw from 'tailwind-styled-components'
import Asset from '../../Asset/Asset'
import { AudioSlider } from 'components/ui/audio-slider'
import { useModalDispatch } from 'contexts/ModalContext'
import { Song, useAudioPlayerContext } from 'hooks/useAudioPlayer'
import { useState } from 'react'
import { FavoriteTrack } from 'components/common/Buttons/FavoriteTrack/FavoriteTrack'
import { BotttomPlayerTrackSlider } from './components/BotttomPlayerTrackSlider'
import { Playlists } from 'icons/Playlists'
import { SpeakerXMarkIcon, SpeakerWaveIcon } from '@heroicons/react/24/outline'
import { IoIosArrowUp, IoIosArrowDown } from 'react-icons/io'

/**
 * DesktopBottomAudioPlayer - UI only, no audio element
 * Audio is handled by AudioEngine component to prevent echo
 */
export const BottomAudioPlayer = () => {
  const [isCollapsed, setIsCollapsed] = useState(false)

  const {
    currentSong,
    setVolume,
    volume,
    setIsPlaylistOpen,
  } = useAudioPlayerContext()

  const { dispatchShowAudioPlayerModal } = useModalDispatch()

  const showPlayList = () => {
    dispatchShowAudioPlayerModal(true)
    setIsPlaylistOpen(true)
  }

  const toggleCollapse = () => setIsCollapsed(!isCollapsed)

  if (!currentSong.src) return null

  const song: Song = {
    trackId: currentSong.trackId,
    src: currentSong.src,
    art: currentSong.art,
    title: currentSong.title,
    artist: currentSong.artist,
    isFavorite: currentSong.isFavorite,
  }

  return (
    <Container style={{ height: isCollapsed ? '60px' : '90px' }}>
      {!isCollapsed && (
        <TrackDetails>
          <ImageContainer>
            <Asset src={currentSong.art} />
          </ImageContainer>
          <Title>
            <h2 className="w-[150px] truncate font-medium text-white">{currentSong.title || 'Unknown Title'}</h2>
            <p className="w-[150px] truncate font-normal text-neutral-400">{currentSong.artist || 'Unknown artist'}</p>
          </Title>
          <FavoriteTrack />
        </TrackDetails>
      )}
      <BotttomPlayerTrackSlider song={song} playerClassNames="mr-12" />
      <TrackControls>
        <button aria-label="Playlist" className="flex h-10 w-10 items-center justify-end" onClick={showPlayList}>
          <Playlists fillColor="white" />
        </button>
        <div className="flex items-center gap-2">
          <SpeakerXMarkIcon className="h-4 w-4 text-white" />
          <div className="">
            <AudioSlider
              className="volume-slider w-[50px]"
              min={0}
              max={1}
              value={volume}
              onChange={value => setVolume(value)}
              step={0.1}
            />
          </div>
          <SpeakerWaveIcon className="h-4 w-4 text-white ml-1" />
        </div>
        <IoIosArrowUp
          size={25}
          color="white"
          className="ml-2 hover:cursor-pointer"
          onClick={() => dispatchShowAudioPlayerModal(true)}
        />
        <IoIosArrowDown
          size={25}
          color="white"
          className="ml-2 hover:cursor-pointer"
          onClick={toggleCollapse}
        />
      </TrackControls>
    </Container>
  )
}

export default BottomAudioPlayer

const Container = tw.div`
  flex 
  justify-between
  items-center
  bg-neutral-900 
  h-[90px]
  mt-4
  transition-all duration-300
`

const TrackDetails = tw.div`
  flex
  items-center
`

const ImageContainer = tw.div`
  h-[120px]
  w-[120px]
`

const Title = tw.div`
  flex
  flex-col
  items-start
  mr-6
  ml-3
`

const TrackControls = tw.div`
  flex 
  items-center 
  mt-4 
  mr-4 
  justify-center 
  gap-2 
  h-full
`
