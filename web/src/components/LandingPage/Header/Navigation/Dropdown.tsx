import { Popover, Transition } from '@headlessui/react'
import { Fragment, ReactChild, useState } from 'react'

interface Props {
  title: string
  children: ReactChild
  alwaysVisible?: boolean
  cursor?: 'pointer' | 'default'
}
export const Dropdown = (props: Props) => {
  const { title, alwaysVisible, cursor, children } = props

  const [showDropdown, setShowDropdown] = useState(false)

  return (
    <div className="relative">
      <Popover.Button
        className={`relative bg-gradient-to-r from-[#ab4eff] to-[#84ff82] bg-clip-text font-semibold text-gray-80 transition duration-150 ease-in-out hover:text-transparent hover:cursor-${
          cursor || 'pointer'
        }`}
        onMouseEnter={() => setShowDropdown(true)}
        onMouseLeave={() => setShowDropdown(false)}
      >
        {showDropdown ? (
          <span className="bg-gradient-to-r from-[#ab4eff] to-[#84ff82] bg-clip-text font-semibold text-transparent">
            {title}
          </span>
        ) : (
          title
        )}
      </Popover.Button>
      <Transition
        as={Fragment}
        enter="transition ease-out duration-200"
        enterFrom="opacity-0 translate-y-1"
        enterTo="opacity-100 translate-y-0"
        leave="transition ease-in duration-150"
        leaveFrom="opacity-100 translate-y-0"
        leaveTo="opacity-0 translate-y-1"
        show={alwaysVisible ? true : showDropdown}
      >
        <Popover.Panel
          className="max-content absolute top-[30px] left-[-200%] z-10 rounded-lg bg-gray-10 p-4 text-gray-80"
          onMouseEnter={() => setShowDropdown(true)}
          onMouseLeave={() => setShowDropdown(false)}
        >
          {children}
        </Popover.Panel>
      </Transition>
    </div>
  )
}
