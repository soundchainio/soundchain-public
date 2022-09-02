import { Logo } from '../../icons/Logo'
import Link from 'next/link'
import { Dialog, Transition } from '@headlessui/react'
import { MenuIcon } from '@heroicons/react/solid'
import React, { useState } from 'react'

function HeaderDrawer({ open, close }: { open: boolean; close: () => void }) {
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

export default function LandingPageHeader() {
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <>
      <header className="h-14">
        <nav className="container mx-auto flex h-full items-center px-4 text-white md:px-0">
          <Link href="/">
            <a className="flex items-center gap-4">
              <Logo className="block h-8 w-auto" />
              <span className="text-lg font-semibold text-slate-50">SoundChain</span>
            </a>
          </Link>
          <div className="flex-1" />
          <ul className="hidden gap-4 md:flex">
            <li className="text-md cursor-pointer font-semibold text-slate-400 hover:text-slate-200">
              <Link href="#roadmap">
                <a>Roadmap</a>
              </Link>
            </li>
            <li className="text-md cursor-pointer font-semibold text-slate-400 hover:text-slate-200">
              <Link href="/ogun" target="_blank">
                <a>OGUN Token</a>
              </Link>
            </li>
          </ul>
          <button onClick={() => setDrawerOpen(true)} className="p-4 outline-0 focus:outline-0 active:outline-0">
            <MenuIcon className="h-6 w-6 text-white md:hidden" />
          </button>
        </nav>
      </header>

      <HeaderDrawer open={drawerOpen} close={() => setDrawerOpen(false)} />
    </>
  )
}
