import { Dialog, Transition } from '@headlessui/react'
import React from 'react'

interface MobileModalProps {
  open: boolean
  close: () => void
  children: React.ReactNode
}

export const MobileModal = (props: MobileModalProps) => {
  const { children, open, close } = props

  return (
    <Transition show={open} as={React.Fragment}>
      <Dialog onClose={close} className="relative z-50">
        <div className="fixed left-0 bottom-0 w-full bg-black/50 p-0">
          <Transition.Child
            as={React.Fragment}
            enter="transition duration-200 ease-out"
            enterFrom="transform translate-y-[100%]"
            enterTo="transform translate-y-0 opacity-100"
            leave="transition duration-100 ease-out"
            leaveFrom="transform translate-y-0 opacity-100"
            leaveTo="transform translate-y-[100%]"
          >
            <Dialog.Panel className="rounded bg-neutral-800">
              <Dialog.Description>{children}</Dialog.Description>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  )
}
