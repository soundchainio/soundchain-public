import { Logo } from '../../../icons/Logo'
import { MenuIcon } from '@heroicons/react/solid'
import React, { useState } from 'react'
import { Navigation } from './Navigation'
import { HeaderDrawer } from './drawer'
import Link from 'next/link'

export default function LandingPageHeader() {
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <>
      <header className="flex h-[70px] w-full items-center justify-between">
        <Link href="/">
          <a className="flex items-center gap-2 p-4">
            <Logo className="block h-8 w-auto" />
            <span className="text-lg font-semibold text-slate-50">SoundChain</span>
          </a>
        </Link>
        <Navigation />
        <button onClick={() => setDrawerOpen(true)} className="p-4 outline-0 focus:outline-0 active:outline-0">
          <MenuIcon className="h-6 w-6 text-white md:hidden" />
        </button>
      </header>

      <HeaderDrawer open={drawerOpen} close={() => setDrawerOpen(false)} />
    </>
  )
}
