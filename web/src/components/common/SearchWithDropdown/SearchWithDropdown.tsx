import { Fragment, useEffect, useMemo, useState } from 'react'
import { Combobox, Transition } from '@headlessui/react'
import tw from 'tailwind-styled-components'
import { PageInput, SortExploreTracksField, useExploreTracksLazyQuery } from 'lib/graphql'
import { debounce } from 'utils/debounce'
import Asset from 'components/Asset/Asset'
import { ProfileCover } from 'components/ProfileCover'
import { Avatar } from 'components/Avatar'

const pageSize = 15

export const SearchWithDropdown = () => {
  const [selected, setSelected] = useState()
  const [searchTerm, setSearchTerm] = useState('guns')
  const firstPage: PageInput = { first: pageSize }

  const [getTracks, { data, fetchMore }] = useExploreTracksLazyQuery({
    variables: { sort: { field: SortExploreTracksField.CreatedAt }, search: searchTerm, page: firstPage },
  })

  const onSearchChanged = useMemo(
    () =>
      debounce((newValue: string) => {
        setSearchTerm(newValue)
      }, 1000),
    [setSearchTerm],
  )

  useEffect(() => {
    if (!searchTerm) return
    getTracks()
    console.log(data)
  }, [data, getTracks, searchTerm])

  return (
    <div className="relative z-10 w-full">
      <Border>
        <Combobox value={selected} onChange={e => onSearchChanged(e.target.value)}>
          <Combobox.Input
            className="w-full rounded-lg border-none bg-neutral-900 text-white focus:ring-0"
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
            <Combobox.Options className="absolute mt-1 w-full rounded-lg border-none bg-neutral-900 p-4 text-white hover:cursor-pointer hover:bg-neutral-600 focus:ring-0">
              {data &&
                data.exploreTracks.nodes.map((track, index) => (
                  <>
                    <div key={index} className="flex items-center gap-2">
                      <div className="h-10 w-10">
                        <Asset src={track.artworkUrl} sizes="5rem" disableImageWave />
                      </div>
                      <h3 className="text-md font-semibold">{track.title}</h3>
                    </div>
                    <div className="relative h-[125px]">
                      {/* <ProfileCover coverPicture={coverPicture || ''} className="h-[125px]" />
                  <Avatar
                    profile={profile}
                    pixels={80}
                    className="absolute left-4 bottom-0 translate-y-2/3 transform rounded-full border-4 border-gray-10"
                  /> */}
                    </div>
                  </>
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
