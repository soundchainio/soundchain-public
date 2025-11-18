import React, { useState } from 'react'

import { Logo } from 'icons/Logo'
import Link from 'next/link'
import { useRouter } from 'next/router'

import { Dialog, Transition } from '@headlessui/react'
import { Bars3Icon } from '@heroicons/react/24/outline'

import RainbowLink from './Links/RainbowLink'

interface NavItemProps {
  text: string
  link?: string
}

export const NavItem = ({ text, link }: NavItemProps) => {
  const router = useRouter()
  const currentPage = router.pathname.replace('/', '')
  const underline = currentPage.toLowerCase() === text.toLowerCase()

  return underline ? (
    <div className="flex flex-col items-center">
      <div className="flex items-center justify-center p-2">{text}</div>
      <div className="bg-green-blue-gradient w-5/6 pb-1" />
    </div>
  ) : (
    <a className="hidden md:inline" href={link ? link : '/' + text.toLowerCase()}>
      <div className="flex items-center justify-center p-2">{text}</div>
    </a>
  )
}

function HeaderDrawer({ open, close }: { open: boolean; close: () => void }) {
  return (
    <Transition show={open}>
      <Dialog onClose={close} className="relative z-20">
        <div className="fixed inset-0 flex items-center justify-end bg-black/50 p-0">
          <Transition.Child
            enter="transition duration-200 ease-out"
            enterFrom="transform translate-x-[100%]"
            enterTo="transform translate-x-0 opacity-100"
            leave="transition duration-100 ease-out"
            leaveFrom="transform translate-x-0 opacity-100"
            leaveTo="transform translate-x-[100%]"
          >
            <div className="h-screen w-full max-w-[300px] rounded bg-[#131313]">
              <div className="p-4">
                <ul className="flex flex-col gap-4">
                  <li className="text-md cursor-pointer font-semibold text-slate-400 hover:text-slate-200">
                    <Link href="https://soundchain.gitbook.io/soundchain/token/ogun">Tokenomics</Link>
                  </li>
                </ul>
              </div>
            </div>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  )
}

export const Header = () => {
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <>
      <header className="h-20">
        <div className="my-0 flex h-20 w-full items-center justify-between px-6 pt-4 lg:px-10">
          <Link href="/" passHref>
            <div className="flex items-center">
              <Logo className="h-[50px]" />
              <span className="hidden font-extrabold text-white md:block">SoundChain</span>
            </div>
          </Link>
          <nav className="flex items-center justify-evenly gap-3 text-white">
            {/* TODO: disabling this for the soft launch */}
            {/* <NavItem text="Stake" /> */}
            <NavItem text="Airdrop" />
            <NavItem text="Tokenomics" link="https://soundchain.gitbook.io/soundchain/token/ogun" />
            <div className="scale-95">
              <RainbowLink href="/marketplace" className="px-2 text-center text-sm font-medium uppercase">
                CONTINUE TO SOUNDCHAIN
              </RainbowLink>
            </div>

            <button onClick={() => setDrawerOpen(true)} className="px-2 outline-0 focus:outline-0 active:outline-0">
              <Bars3Icon className="h-6 w-6 text-white md:hidden" />
            </button>
          </nav>
        </div>
      </header>

      <HeaderDrawer open={drawerOpen} close={() => setDrawerOpen(false)} />
    </>
  )
}