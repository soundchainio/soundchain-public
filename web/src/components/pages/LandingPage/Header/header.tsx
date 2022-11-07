import { MenuIcon } from '@heroicons/react/solid'
import { Button } from 'components/common/Buttons/Button'
import { useMeQuery } from 'lib/graphql'
import Link from 'next/link'
import { useState } from 'react'
import { BsArrowRightShort } from 'react-icons/bs'
import { svgGradientFromPurpleToGreen } from 'styles/svgGradientFromPurpleToGreen'
import { Logo } from '../../../../icons/Logo'
import { HeaderDrawer } from './drawer'
import { Navigation } from './Navigation'

export default function LandingPageHeader() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const { data } = useMeQuery()
  const me = data?.me

  return (
    <>
      {svgGradientFromPurpleToGreen()}
      <header className="flex w-full items-center justify-between py-8">
        <Link href="/">
          <a className="ml-4 flex items-center gap-2 md:ml-10">
            <Logo className="block h-8 w-auto" />
            <span className="text-lg font-semibold text-slate-50">SoundChain</span>
          </a>
        </Link>

        <Navigation />
        {!me ? (
          <Link href="/login">
            <a className="ml-2 hidden md:block">
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
        ) : (
          <Link href={`/profiles/${me.handle}`}>
            <a className="group mr-10 ml-2 hidden items-center md:flex">
              <span className="text-md bg-gradient-to-r from-[#ab4eff] to-[#84ff82] bg-clip-text text-gray-80 group-hover:text-transparent">
                @{me.handle}
              </span>
              <BsArrowRightShort size={25} className="text-gray-80 group-hover:fill-[url(#blue-gradient)]" />
            </a>
          </Link>
        )}
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
