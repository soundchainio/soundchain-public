import { Fragment, useEffect, useMemo, useState } from 'react'
import { Combobox, Transition } from '@headlessui/react'
import tw from 'tailwind-styled-components'
import { debounce } from 'utils/debounce'
import Asset from 'components/Asset/Asset'
import { getExploreTracksWithProfiles } from 'repositories/explore/explore'
import { ProfileWithAvatar } from 'components/ProfileWithAvatar'
import { Profile, Track } from 'lib/graphql'
import { usePlaylistContext } from 'hooks/usePlaylistContext'

type TracksWithProfile = Track & { profile: Profile }

export const SearchWithDropdown = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [tracks, setTracks] = useState<TracksWithProfile[] | null>(null)

  const { temporaryTracks, setTemporaryTracks } = usePlaylistContext()
  const onSearchChanged = useMemo(
    () =>
      debounce((newValue: string) => {
        setSearchTerm(newValue)
      }, 1000),
    [setSearchTerm],
  )

  const handleSetTemporaryTrack = (newTrack: TracksWithProfile) => {
    if (temporaryTracks.includes(newTrack)) return

    setTemporaryTracks(prevState => [...prevState, newTrack])
  }

  useEffect(() => {
    if (!searchTerm) return

    const getTracks = async () => {
      const tracksWithProfiles = await getExploreTracksWithProfiles(searchTerm)

      if (!tracksWithProfiles) return

      setTracks(tracksWithProfiles)
    }

    getTracks()
  }, [searchTerm])

  return (
    <div className="relative z-10 w-full">
      <h4 className="absolute left-3 top-2 text-xxs font-bold uppercase text-gray-60">Search...</h4>
      <Border>
        <Combobox onChange={e => onSearchChanged(e.target.value)}>
          <Combobox.Input
            className="w-full rounded-lg border-none bg-neutral-900 pt-6 text-white focus:ring-0"
            onChange={event => setSearchTerm(event.target.value)}
            defaultValue="Search Tracks"
          />
          <Transition
            as={Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
            afterLeave={() => setSearchTerm('')}
          >
            <Combobox.Options className="absolute w-full rounded-lg border-none bg-neutral-900 p-4 text-white hover:cursor-pointer hover:bg-neutral-600 focus:ring-0">
              {tracks &&
                tracks.map((track, index) => (
                  <div
                    className="flex items-center justify-between"
                    key={index}
                    onClick={() => handleSetTemporaryTrack(track)}
                  >
                    <div className="flex items-center gap-2">
                      <div className="h-10 w-10">
                        <Asset src={track.artworkUrl} sizes="5rem" disableImageWave />
                      </div>
                      <h3 className="text-md font-semibold">{track.title}</h3>
                    </div>
                    <ProfileWithAvatar profile={track.profile} avatarSize={30} shouldRedirect={false} />
                  </div>
                ))}
            </Combobox.Options>
          </Transition>
        </Combobox>
      </Border>
    </div>
  )
}

const Border = tw.div`
  bg-neutral-600
  p-[1px]
  rounded-lg
`
