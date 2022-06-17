import { Logo } from '../../icons/Logo';
import Link from 'next/link';
import { Dialog, Transition } from '@headlessui/react';
import { MenuIcon } from '@heroicons/react/solid';
import React, { useState } from 'react';

function HeaderDrawer({ open, close }: { open: boolean, close: () => void }) {
  return (
    <Transition
      show={open}
      as={React.Fragment}>
      <Dialog onClose={close} className='relative z-50'>
        <div className='fixed inset-0 flex items-center justify-end p-0 bg-black/50'>
          <Transition.Child
            as={React.Fragment}
            enter='transition duration-200 ease-out'
            enterFrom='transform translate-x-[100%]'
            enterTo='transform translate-x-0 opacity-100'
            leave='transition duration-100 ease-out'
            leaveFrom='transform translate-x-0 opacity-100'
            leaveTo='transform translate-x-[100%]'>
            <Dialog.Panel className='w-full h-screen max-w-[300px] rounded bg-[#131313]'>
              <div className='p-4'>
                <ul className='gap-4 flex flex-col'>
                  <li className='font-semibold text-md text-slate-400 hover:text-slate-200 cursor-pointer'>
                    <Link href='/roadmap'>
                      <a>Roadmap</a>
                    </Link>
                  </li>
                  <li className='font-semibold text-md text-slate-400 hover:text-slate-200 cursor-pointer'>
                    <Link href='/ogun'>
                      <a>OGUN Token</a>
                    </Link>
                  </li>
                </ul>
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
}

export default function LandingPageHeader() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      <header className='h-14'>
        <nav className='flex container mx-auto items-center text-white h-full px-4 md:px-0'>
          <div className='flex items-center gap-4'>
            <Logo className='block h-8 w-auto' />
            <Link href='/'>
              <a className='text-slate-50 text-lg font-semibold'>SoundChain</a>
            </Link>
          </div>
          <div className='flex-1' />
          <ul className='gap-4 hidden md:flex'>
            <li className='font-semibold text-md text-slate-400 hover:text-slate-200 cursor-pointer'>
              <Link href='#roadmap'>
                <a>Roadmap</a>
              </Link>
            </li>
            <li className='font-semibold text-md text-slate-400 hover:text-slate-200 cursor-pointer'>
              <Link href='/ogun' target='_blank'>
                <a>OGUN Token</a>
              </Link>
            </li>
          </ul>
          <button onClick={() => setDrawerOpen(true)} className='outline-0 active:outline-0 focus:outline-0 p-4'>
            <MenuIcon className='w-6 h-6 text-white md:hidden' />
          </button>
        </nav>
      </header>

      <HeaderDrawer open={drawerOpen} close={() => setDrawerOpen(false)} />
    </>
  );
}