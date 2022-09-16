import React from 'react'
import Link from 'next/link'
import { Dialog, Transition } from '@headlessui/react'

export const HeaderDrawer = ({ open, close }: { open: boolean; close: () => void }) => {
  return (
    <Transition show={open} as={React.Fragment}>
      <Dialog onClose={close} className="relative z-50">
        <div className="fixed inset-0 flex items-center justify-end bg-black/50 p-0">
          <Transition.Child
            as={React.Fragment}
            enter="transition duration-200 ease-out"
            enterFrom="transform translate-x-[100%]"
            enterTo="transform translate-x-0 opacity-100"
            leave="transition duration-100 ease-out"
            leaveFrom="transform translate-x-0 opacity-100"
            leaveTo="transform translate-x-[100%]"
          >
            <Dialog.Panel className="h-screen w-full max-w-[300px] rounded bg-[#131313]">
              <Dialog.Description className="p-4">
                <div className="p-4">
                  <ul className="flex flex-col gap-4">
                    <li className="text-md cursor-pointer font-semibold text-slate-400 hover:text-slate-200">
                      <Link href="/roadmap">
                        <a>Roadmap</a>
                      </Link>
                    </li>
                    <li className="text-md cursor-pointer font-semibold text-slate-400 hover:text-slate-200">
                      <Link href="/ogun">
                        <a>OGUN Token</a>
                      </Link>
                    </li>
                  </ul>
                </div>
              </Dialog.Description>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  )
}
