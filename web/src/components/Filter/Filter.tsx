import { Dispatch, Fragment, SetStateAction, useEffect, useState } from 'react'

import classNames from 'classnames'
import { SortListingItem } from 'lib/apollo/sorting'
import { MdKeyboardArrowDown } from 'react-icons/md'

/* eslint-disable react-hooks/exhaustive-deps */
import { Listbox, Transition } from '@headlessui/react'

interface Props {
  sorting: SortListingItem
  setSorting: Dispatch<SetStateAction<SortListingItem>>
  options?: Option[]
  mobile?: boolean
  noMarginRight?: boolean
}

type Option = { value: string; name: string }

const defaultOptions = [
  { value: SortListingItem.PriceAsc, name: 'Least expensive' },
  { value: SortListingItem.PriceDesc, name: 'Most expensive' },
  { value: SortListingItem.PlaybackCount, name: 'Most listened' },
  { value: SortListingItem.CreatedAt, name: 'Newest' },
]

export const FilterComponent = (props: Props) => {
  const { mobile, noMarginRight, sorting, setSorting, options = defaultOptions } = props

  const [selected, setSelected] = useState<Option | null>(null)

  const handleSetValueOnRender = () => {
    if (selected || !sorting) return

    options.forEach(option => {
      if (option.value === sorting) setSelected(option)
    })
  }

  const handleOnSelect = () => {
    if (!selected) return

    setSorting(selected.value as SortListingItem)
  }

  useEffect(() => {
    handleSetValueOnRender()
    handleOnSelect()
  }, [selected])

  return (
    <div className={classNames('flex items-center', { 'mr-4': !noMarginRight })}>
      <label
        className={classNames('mr-4 text-xs font-bold text-white', {
          'hidden md:inline-block': !mobile,
          'inline-block': mobile,
        })}
      >
        Sort By:
      </label>
      <div
        className={classNames('z-10', {
          flex: mobile,
          'hidden md:flex': !mobile,
        })}
      >
        <Listbox value={selected} onChange={setSelected}>
          {({ open }) => (
            <div className="relative">
              <Listbox.Button
                className={`hover:gradient-select-hover transparent-border-1px darkGreyBackgroundColor w-[160px] cursor-default rounded-lg py-2 pl-3 pr-10 text-left font-medium  text-white shadow-md focus:outline-none focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 focus-visible:ring-offset-2 focus-visible:ring-offset-orange-300 sm:w-[140px] sm:text-sm ${
                  open ? 'gradient-select-hover' : ''
                }`}
              >
                <span className="block truncate">{selected?.name}</span>
                <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                  <MdKeyboardArrowDown className="text-grey-400 h-5 w-5" aria-hidden="true" />
                </span>
              </Listbox.Button>
              <Transition
                as={Fragment}
                leave="transition ease-in duration-100"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <Listbox.Options className="darkGreyBackgroundColor absolute mt-1 max-h-60 w-full overflow-auto rounded-md py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                  {options.map((option, index) => (
                    <Listbox.Option
                      key={index}
                      className={({ active }) =>
                        `relative cursor-default select-none py-2 pl-3 pr-4 ${active ? 'grey80BackgroundColor' : ''}`
                      }
                      value={option}
                    >
                      {({ selected }) => (
                        <>
                          <span className={`block truncate ${selected ? 'font-bold' : 'font-medium'} text-white`}>
                            {option.name}
                          </span>
                        </>
                      )}
                    </Listbox.Option>
                  ))}
                </Listbox.Options>
              </Transition>
            </div>
          )}
        </Listbox>
      </div>
    </div>
  )
}