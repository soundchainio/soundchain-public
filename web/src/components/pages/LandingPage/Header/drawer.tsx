import React from 'react'

import { Button } from 'components/common/Buttons/Button'
import { useMeQuery } from 'lib/graphql'
import Link from 'next/link'
import { BsArrowRightShort } from 'react-icons/bs'

import { Dialog, Transition } from '@headlessui/react'

import { Logo } from '../../../../icons/Logo'

export const HeaderDrawer = ({ open, close }: { open: boolean; close: () => void }) => {
  const { data } = useMeQuery({ ssr: false })
  const me = data?.me

  return (
    <Transition show={open}>
      <Dialog onClose={close} className="relative z-50">
        <div className="fixed inset-0 flex items-center justify-end bg-black/50 p-0">
          <Transition.Child
            enter="transition duration-200 ease-out"
            enterFrom="transform translate-x-[100%]"
            enterTo="transform translate-x-0 opacity-100"
            leave="transition duration-100 ease-out"
            leaveFrom="transform translate-x-0 opacity-100"
            leaveTo="transform translate-x-[100%]"
          >
            <div className="h-screen w-full max-w-[300px] rounded bg-black">
              <Dialog.Description>
                <div className="mt-4 flex flex-col">
                  <div className="flex w-full items-center justify-center border-b-[1px] border-gray-30 pb-6">
                    <Logo className="block h-8 w-auto" />
                  </div>
                  <ul className="mt-4 flex flex-col">
                    <li className="text-md mb-4 cursor-pointer border-b-[1px] border-gray-30 bg-gradient-to-r from-[#ab4eff] to-[#84ff82] bg-clip-text pl-6 pb-4 font-normal text-gray-80 transition duration-150 ease-in-out hover:text-transparent">
                      <Link href="/dex">Marketplace</Link>
                    </li>
                    <li className="text-md mb-4 cursor-pointer border-b-[1px] border-gray-30 bg-gradient-to-r from-[#ab4eff] to-[#84ff82] bg-clip-text pl-6 pb-4 font-normal text-gray-80 transition duration-150 ease-in-out hover:text-transparent">
                      <Link href="/airdrop">Airdrop</Link>
                    </li>
                    <li className="text-md mb-4 cursor-pointer border-b-[1px] border-gray-30 bg-gradient-to-r from-[#ab4eff] to-[#84ff82] bg-clip-text pl-6 pb-4 font-normal text-gray-80 transition duration-150 ease-in-out hover:text-transparent">
                      <Link href="/ogun">Ogun Token</Link>
                    </li>
                    <li className="text-md mb-4 cursor-pointer border-b-[1px] border-gray-30 bg-gradient-to-r from-[#ab4eff] to-[#84ff82] bg-clip-text pl-6 pb-4 font-normal text-gray-80 transition duration-150 ease-in-out hover:text-transparent">
                      <Link href="/roadmap">Roadmap</Link>
                    </li>
                    <li className="text-md mb-4 cursor-pointer border-b-[1px] border-gray-30 bg-gradient-to-r from-[#ab4eff] to-[#84ff82] bg-clip-text pl-6 pb-4 font-normal text-gray-80 transition duration-150 ease-in-out hover:text-transparent">
                      <Link href="https://soundchain-1.gitbook.io/soundchain-docs/" target="blank">
                        Whitepaper
                      </Link>
                    </li>
                    <li className="text-md mb-4 mt-1 flex w-full cursor-pointer items-center justify-center border-b-[1px] border-gray-30 pb-4">
                      {!me ? (
                        <Link href="/login" passHref>
                          <Button
                            variant="outline"
                            className="h-8 w-64 bg-opacity-70"
                            borderColor="bg-gray-40"
                            bgColor="bg-black"
                          >
                            Login / Sign up
                          </Button>
                        </Link>
                      ) : (
                        <Link href={`/profiles/${me.handle}`} className="group mr-10 flex items-center" passHref>
                          <span className="text-md bg-gradient-to-r from-[#ab4eff] to-[#84ff82] bg-clip-text text-gray-80 group-hover:text-transparent">
                            @{me.handle}
                          </span>
                          <BsArrowRightShort
                            size={25}
                            className="text-gray-80 group-hover:fill-[url(#blue-gradient)]"
                          />
                        </Link>
                      )}
                    </li>
                  </ul>
                </div>
              </Dialog.Description>
            </div>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  )
}