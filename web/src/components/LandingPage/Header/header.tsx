import { Logo } from '../../../icons/Logo'
import { MenuIcon } from '@heroicons/react/solid'
import React, { useState } from 'react'
import { Navigation } from './Navigation'
import { HeaderDrawer } from './drawer'
import Link from 'next/link'
import { Button } from 'components/Button'

export default function LandingPageHeader() {
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <>
      <header className="flex w-full items-center justify-between py-8">
        <Link href="/">
          <a className="ml-4 flex items-center gap-2 md:ml-10">
            <Logo className="block h-8 w-auto" />
            <span className="text-lg font-semibold text-slate-50">SoundChain</span>
          </a>
        </Link>

        <Navigation />

        <Link href="/login">
          <a className="hidden md:block">
            <Button
              variant="outline"
              className="mr-10 h-8 w-32 bg-opacity-70"
              borderColor="bg-gray-40"
              bgColor="bg-black"
            >
              Login / Sign up
            </Button>
          </a>
        </Link>

        <button
          onClick={() => setDrawerOpen(true)}
          className="p-4 outline-0 focus:outline-0 active:outline-0 md:hidden"
        >
          <MenuIcon className="h-8 w-8 text-white md:hidden" />
        </button>

        <HeaderDrawer open={drawerOpen} close={() => setDrawerOpen(false)} />
      </header>
    </>
  )
}
