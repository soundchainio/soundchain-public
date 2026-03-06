import React, { Fragment, ReactNode, useRef } from 'react'
import { Dialog, Transition } from '@headlessui/react'

interface ModalProps {
  show: boolean
  children: ReactNode
  title: string | JSX.Element
  leftButton?: JSX.Element
  rightButton?: JSX.Element
  onClose: (open: boolean) => void
  fullScreen?: boolean
}

export const Modal = ({ show, children, title, leftButton, rightButton, onClose, fullScreen }: ModalProps) => {
  const ref = useRef(null)
  
  // Safety check - don't render if show is undefined or false
  if (!show) return null
  
  // Fullscreen mode - no header, no rounded corners, just the content
  if (fullScreen) {
    return (
      <Transition appear show={show} as={Fragment}>
        <Dialog
          as="div"
          className="fixed inset-0 z-[100]"
          onClose={onClose}
          initialFocus={ref}
        >
          <Transition.Child
            as={Fragment}
            enter="transition ease-in-out duration-300 transform"
            enterFrom="translate-y-full opacity-0"
            enterTo="translate-y-0 opacity-100"
            leave="transition ease-in-out duration-300 transform"
            leaveFrom="translate-y-0 opacity-100"
            leaveTo="translate-y-full opacity-0"
          >
            <div className="fixed inset-0" ref={ref}>
              {children}
            </div>
          </Transition.Child>
        </Dialog>
      </Transition>
    )
  }

  return (
    <Transition appear show={show} as={Fragment}>
      <Dialog
        as="div"
        className="fixed inset-0 z-40 flex h-full w-full flex-col overflow-y-scroll"
        onClose={onClose}
        initialFocus={ref}
      >
        <Transition.Child
          as={Fragment}
          enter="transition-opacity ease-linear duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="transition-opacity ease-linear duration-300"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-15 bg-opacity-50" />
        </Transition.Child>
        <div className="h-16 flex-shrink-0" aria-hidden="true" ref={ref}></div>
        <Transition.Child
          as={Fragment}
          enter="transition ease-in-out duration-300 transform"
          enterFrom="translate-y-full"
          enterTo="translate-y-0"
          leave="transition ease-in-out duration-300 transform"
          leaveFrom="translate-y-0"
          leaveTo="translate-y-full"
        >
          <div className="relative flex w-full flex-1 flex-col">
            <div className="flex h-16 items-center rounded-tl-3xl rounded-tr-3xl bg-gray-20">
              <div className="flex-1">{leftButton}</div>
              <div className="flex-2 text-center font-bold text-white">{title}</div>
              <div className="flex-1">{rightButton}</div>
            </div>
            <div className="relative flex h-full flex-col bg-gray-10">{children}</div>
          </div>
        </Transition.Child>
      </Dialog>
    </Transition>
  )
}