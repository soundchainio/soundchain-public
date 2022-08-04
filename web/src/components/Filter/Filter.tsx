/* eslint-disable react-hooks/exhaustive-deps */
import React, { Dispatch, SetStateAction, useState, Fragment, useEffect } from 'react';
import { SortListingItem } from 'lib/apollo/sorting';
import { Listbox, Transition } from '@headlessui/react';
import { MdKeyboardArrowDown } from 'react-icons/md';
interface Props {
  sorting: SortListingItem;
  setSorting: Dispatch<SetStateAction<SortListingItem>>;
  options?: Option[]
}

type Option = { value: string; name: string };

const defaultOptions = [
  { value: SortListingItem.PriceAsc, name: 'Least expensive' },
  { value: SortListingItem.PriceDesc, name: 'Most expensive' },
  { value: SortListingItem.PlaybackCount, name: 'Most listened' },
  { value: SortListingItem.CreatedAt, name: 'Newest' },
]

export const FilterComponent = (props: Props) => {
  const { sorting, setSorting, options = defaultOptions } = props;

  const [selected, setSelected] = useState<Option | null>(null);

  const handleSetValueOnRender = () => {
    if (selected || !sorting) return;

    options.forEach(option => {
      if (option.value === sorting) setSelected(option);
    });
  };

  const handleOnSelect = () => {
    if (!selected) return;

    setSorting(selected.value as SortListingItem);
  };

  useEffect(() => {
    handleSetValueOnRender();
    handleOnSelect();
  }, [selected]);

  return (
    <div className="flex items-center mr-4">
      <label className="text-white mr-4 font-bold hidden md:inline-block">Sort By:</label>
      <div className="w-[180px]  z-10 hidden md:flex">
        <Listbox value={selected} onChange={setSelected}>
          <div className="relative">
            <Listbox.Button
              className={({ open }) =>
                `relative w-full text-white hover:gradient-select-hover transparent-border-1px font-medium py-2 pl-3 pr-10 text-left darkGreyBackgroundColor  rounded-lg shadow-md cursor-default focus:outline-none focus-visible:ring-2 focus-visible:ring-opacity-75 focus-visible:ring-white focus-visible:ring-offset-orange-300 focus-visible:ring-offset-2 focus-visible:border-indigo-500 sm:text-sm ${
                  open ? 'gradient-select-hover' : ''
                }`
              }
            >
              <span className="block truncate">{selected?.name}</span>
              <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                <MdKeyboardArrowDown className="w-5 h-5 text-grey-400" aria-hidden="true" />
              </span>
            </Listbox.Button>
            <Transition
              as={Fragment}
              leave="transition ease-in duration-100"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <Listbox.Options className="absolute w-full py-1 mt-1 overflow-auto darkGreyBackgroundColor rounded-md shadow-lg max-h-60 ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                {options.map((option, index) => (
                  <Listbox.Option
                    key={index}
                    className={({ active }) =>
                      `cursor-default select-none relative py-2 pl-3 pr-4 ${active ? 'grey80BackgroundColor' : ''}`
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
        </Listbox>
      </div>
    </div>
  );
};
