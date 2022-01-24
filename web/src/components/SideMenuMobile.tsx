import { Dialog, Transition } from '@headlessui/react';
import { config } from 'config';
import { Fragment, useRef } from 'react';
import { SideMenuContent } from './SideMenuContent';

export interface SideMenuMobileProps {
  isOpen: boolean;
  setOpen: (open: boolean) => void;
}

export const SideMenuMobile = ({ setOpen, isOpen }: SideMenuMobileProps) => {
  const ref = useRef(null);
  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog
        as="div"
        className={`fixed inset-0 flex z-40 ${config.mobileBreakpoint}:hidden`}
        onClose={setOpen}
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
          <Dialog.Overlay className="fixed inset-0 bg-gray-15 bg-opacity-75" />
        </Transition.Child>
        <Transition.Child
          as={Fragment}
          enter="transition ease-in-out duration-300 transform"
          enterFrom="-translate-x-full"
          enterTo="translate-x-0"
          leave="transition ease-in-out duration-300 transform"
          leaveFrom="translate-x-0"
          leaveTo="-translate-x-full"
        >
          <div className="relative flex-1 flex flex-col max-w-xs w-full pt-5 pb-4 bg-gray-15">
            <div className="flex-shrink-0 flex items-center"></div>
            <SideMenuContent isMobile />
          </div>
        </Transition.Child>
        <div className="flex-shrink-0 w-14" aria-hidden="true" ref={ref}></div>
      </Dialog>
    </Transition.Root>
  );
};
