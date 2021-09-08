import { Dialog, Transition } from '@headlessui/react';
import 'emoji-mart/css/emoji-mart.css';
import { default as React, Fragment, ReactNode } from 'react';

interface ModalProps {
  show: boolean;
  children: ReactNode;
  title: string;
  leftButton?: JSX.Element;
  rightButton?: JSX.Element;
  setOpen?: (open: boolean) => void;
}

export const Modal = ({ show, children, title, leftButton, rightButton, setOpen }: ModalProps) => {
  return (
    <>
      <Transition.Root show={show} as={Fragment}>
        <Dialog as="div" className="fixed w-full inset-0 flex z-40" onClose={() => setOpen && setOpen(false)}>
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
            enterFrom="translate-y-full"
            enterTo="translate-y-0"
            leave="transition ease-in-out duration-300 transform"
            leaveFrom="translate-y-0"
            leaveTo="translate-y-full"
          >
            <div className="relative flex-1 flex flex-col w-full">
              <div className="mt-16">
                <div className="flex h-16 items-center rounded-tl-3xl rounded-tr-3xl bg-gray-20">
                  <div className="flex-1">{leftButton}</div>
                  <div className="flex-1 text-center text-white font-bold">{title}</div>
                  <div className="flex-1 ">{rightButton}</div>
                </div>
              </div>
              {children}
            </div>
          </Transition.Child>
        </Dialog>
      </Transition.Root>
    </>
  );
};
