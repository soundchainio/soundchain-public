import { Dialog, Transition } from '@headlessui/react';
import 'emoji-mart/css/emoji-mart.css';
import { default as React, Fragment, ReactNode, useRef } from 'react';

interface ModalProps {
  show: boolean;
  children: ReactNode;
  title: string | JSX.Element;
  leftButton?: JSX.Element;
  rightButton?: JSX.Element;
  onClose: (open: boolean) => void;
}

export const Modal = ({ show, children, title, leftButton, rightButton, onClose }: ModalProps) => {
  const ref = useRef(null);
  return (
    <Transition.Root show={show} as={Fragment}>
      <Dialog as="div" className="fixed w-full inset-0 flex flex-col z-40" onClose={onClose} initialFocus={ref}>
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
        <div className="flex-shrink-0 h-16" aria-hidden="true" ref={ref}></div>
        <Transition.Child
          as={Fragment}
          enter="transition ease-in-out duration-300 transform"
          enterFrom="translate-y-full"
          enterTo="translate-y-0"
          leave="transition ease-in-out duration-300 transform"
          leaveFrom="translate-y-0"
          leaveTo="translate-y-full"
        >
          <div className="relative flex-1 flex flex-col w-full h-full">
            <div className="flex h-16 items-center rounded-tl-3xl rounded-tr-3xl bg-gray-20">
              <div className="flex-1">{leftButton}</div>
              <div className="flex-2 text-center text-white font-bold">{title}</div>
              <div className="flex-1 ">{rightButton}</div>
            </div>
            <div className="flex flex-col h-full overflow-y-auto bg-gray-30">{children}</div>
          </div>
        </Transition.Child>
      </Dialog>
    </Transition.Root>
  );
};
