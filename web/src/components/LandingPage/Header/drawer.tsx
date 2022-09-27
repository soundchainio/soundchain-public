import React from 'react'
import Link from 'next/link'
import { Dialog, Transition } from '@headlessui/react'
import { Logo } from '../../../icons/Logo'
import { Button } from 'components/OldButtons/Button'

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
            <Dialog.Panel className="h-screen w-full max-w-[300px] rounded bg-black">
              <Dialog.Description>
                <div className="mt-4 flex flex-col">
                  <div className="flex w-full items-center justify-center border-b-[1px] border-gray-30 pb-6">
                    <Logo className="block h-8 w-auto" />
                  </div>
                  <ul className="mt-4 flex flex-col">
                    <li className="text-md mb-4 cursor-pointer border-b-[1px] border-gray-30 bg-gradient-to-r from-[#ab4eff] to-[#84ff82] bg-clip-text pl-6 pb-4 font-normal text-gray-80 transition duration-150 ease-in-out hover:text-transparent">
                      <Link href="/marketplace">
                        <a>Marketplace</a>
                      </Link>
                    </li>
                    <li className="text-md mb-4 cursor-pointer border-b-[1px] border-gray-30 bg-gradient-to-r from-[#ab4eff] to-[#84ff82] bg-clip-text pl-6 pb-4 font-normal text-gray-80 transition duration-150 ease-in-out hover:text-transparent">
                      <Link href="/airdrop">
                        <a>Airdrop</a>
                      </Link>
                    </li>
                    <li className="text-md mb-4 cursor-pointer border-b-[1px] border-gray-30 bg-gradient-to-r from-[#ab4eff] to-[#84ff82] bg-clip-text pl-6 pb-4 font-normal text-gray-80 transition duration-150 ease-in-out hover:text-transparent">
                      <Link href="/ogun">
                        <a>Ogun Token</a>
                      </Link>
                    </li>
                    <li className="text-md mb-4 cursor-pointer border-b-[1px] border-gray-30 bg-gradient-to-r from-[#ab4eff] to-[#84ff82] bg-clip-text pl-6 pb-4 font-normal text-gray-80 transition duration-150 ease-in-out hover:text-transparent">
                      <Link href="/roadmap">
                        <a>Roadmap</a>
                      </Link>
                    </li>
                    <li className="text-md mb-4 cursor-pointer border-b-[1px] border-gray-30 bg-gradient-to-r from-[#ab4eff] to-[#84ff82] bg-clip-text pl-6 pb-4 font-normal text-gray-80 transition duration-150 ease-in-out hover:text-transparent">
                      <Link href="https://soundchain.gitbook.io/">
                        <a target="blank">Whitepaper</a>
                      </Link>
                    </li>
                    <li className="mt-4 flex w-full items-center justify-center">
                      <Link href="/login">
                        <a>
                          <Button
                            variant="outline"
                            className="h-8 w-64 bg-opacity-70"
                            borderColor="bg-gray-40"
                            bgColor="bg-black"
                          >
                            Login / Sign up
                          </Button>
                        </a>
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
