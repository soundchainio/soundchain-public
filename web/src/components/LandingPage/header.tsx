import { Logo } from '../../icons/Logo';
import Link from 'next/link';

export default function LandingPageHeader() {
  return (
    <header className='h-14'>
      <nav className='flex container mx-auto items-center text-white h-full px-4 md:px-0'>
        <div className='flex items-center gap-4'>
          <Logo className='block h-8 w-auto' />
          <Link href='/'>
            <a className='text-slate-50 text-lg font-semibold'>SoundChain</a>
          </Link>
        </div>
        <div className='flex-1' />
        <ul className='flex gap-4'>
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
      </nav>
    </header>
  )
}