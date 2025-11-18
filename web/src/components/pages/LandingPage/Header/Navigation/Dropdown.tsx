import { ReactChild, useState } from 'react'

import { Popover } from '@headlessui/react'

interface Props {
  title?: string
  children: ReactChild
  alwaysVisible?: boolean
  cursor?: 'pointer' | 'default'
}
export const Dropdown = (props: Props) => {
  const { title, alwaysVisible, cursor = 'default', children } = props

  const [showDropdown, setShowDropdown] = useState(false)

  return (
    <Popover className="relative">
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
      {(alwaysVisible || showDropdown) && (
        <Popover.Panel
          static
          className="max-content absolute top-[30px] left-[-200%] z-10 rounded-lg bg-gray-10 p-4 text-gray-80 transition-all duration-200"
          onMouseEnter={() => setShowDropdown(true)}
          onMouseLeave={() => setShowDropdown(false)}
        >
          {children}
        </Popover.Panel>
      )}
    </Popover>
  )
}