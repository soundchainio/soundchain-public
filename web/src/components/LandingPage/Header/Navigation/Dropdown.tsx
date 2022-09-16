import { Popover, Transition } from '@headlessui/react'
import { Fragment, ReactChild, useState } from 'react'

interface Props {
  title: string
  children: ReactChild
}
export const Dropdown = (props: Props) => {
  const { title, children } = props

  const [showDropdown, setShowDropdown] = useState(false)

  return (
    <>
      <Popover.Button
        onMouseEnter={() => setShowDropdown(true)}
        onMouseLeave={() => setShowDropdown(false)}
        className="relative font-semibold"
      >
        {title}
      </Popover.Button>
      <Transition
        as={Fragment}
        enter="transition ease-out duration-200"
        enterFrom="opacity-0 translate-y-1"
        enterTo="opacity-100 translate-y-0"
        leave="transition ease-in duration-150"
        leaveFrom="opacity-100 translate-y-0"
        leaveTo="opacity-0 translate-y-1"
        show={showDropdown}
      >
        <Popover.Panel
          className="absolute left-0 z-10 rounded-lg bg-gray-10 p-4 text-gray-80"
          onMouseEnter={() => setShowDropdown(true)}
          onMouseLeave={() => setShowDropdown(false)}
        >
          {children}
        </Popover.Panel>
      </Transition>
    </>
  )
}
