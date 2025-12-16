import React from 'react'

import { IconProps } from 'icons/types/IconProps'

import { Popover } from '@headlessui/react'

interface SoundChainPopOverProps {
  icon: (props: IconProps) => JSX.Element
  badge?: () => JSX.Element
  children?: React.ReactNode
}

export type CloseFunction = (focusableElement?: HTMLElement | React.MutableRefObject<HTMLElement | null>) => void

export interface SoundChainPopOverChildProps {
  closePopOver?: CloseFunction
}

export const SoundChainPopOver = (props: SoundChainPopOverProps) => {
  const { icon: Icon, badge: Badge, children } = props

  return (
    <Popover className="relative">
      <Popover.Button className="focus:outline-none">
        <div className="relative mr-1">
          {Badge && <Badge />}
          <Icon />
        </div>
      </Popover.Button>
      <Popover.Panel
        className="text-sm/6 data-[closed]:-translate-y-1 data-[closed]:opacity-0 absolute left-0 z-50 mt-2 w-[320px] max-w-[90vw] translate-y-2 transform rounded-lg bg-gray-15 transition duration-200 ease-in-out shadow-xl"
      >
        {({ close: closePopOver }) => (
          <div className="max-h-[500px] overflow-y-auto">
            {React.Children.map(children, child => {
              if (React.isValidElement<SoundChainPopOverChildProps>(child)) {
                return React.cloneElement(child, { closePopOver })
              }
              return child
            })}
          </div>
        )}
      </Popover.Panel>
    </Popover>
  )
}
