import { Logo } from '../../icons/Logo';
import Image from 'next/image';
import { Button } from '../Button';

export function Section1() {
  return (
    <div className='bg-slate-900 relative flex flex-col'>
      <header className='h-14'>
        <nav className='flex container mx-auto items-center text-white h-full'>
          <div className='flex items-center gap-4'>
            <Logo className='block h-8 w-auto' />
            <span className='text-slate-50 text-lg font-semibold'>SoundChain</span>
          </div>
          <div className='flex-1' />
          <ul className='flex gap-4'>
            <li className='font-semibold text-md text-slate-400 hover:text-slate-200 cursor-pointer'>
              Roadmap
            </li>
            <li className='font-semibold text-md text-slate-400 hover:text-slate-200 cursor-pointer'>
              OGUN Token
            </li>
          </ul>
        </nav>
      </header>

      <main>
        <div>
          {/* Hero card */}
          <div className='relative'>
            <div className='absolute inset-x-0 bottom-0 h-full' />
            <div className={`max-w-7xl lg:max-w-full mx-auto sm:px-6 lg:px-0 min-h-[500px]
             vsm:min-h-[600px] vmd:min-h-[750px] vlg:min-h-[900px] vxl:min-h-[1100px] v2xl:min-h-[1400px]
              max-h-screen flex flex-col`}>
              <div className='relative h-full flex-1'>
                <div className='absolute inset-0 h-full'>
                  <Image
                    className='h-full w-full aspect-video object-cover'
                    src='/landing-page/hero-bg.png'
                    alt='People working on laptops'
                    layout='fill'
                  />
                  <div
                    className='absolute inset-0 from-transparent via-transparent to-black bg-gradient-radial h-full mix-blend-multiply' />
                </div>
                <div className='container mx-auto h-full'>
                  <div
                    className='relative flex flex-col items-start h-full pl-4 py-16 sm:pl-6 sm:py-24 lg:py-32 lg:pl-8'>
                    <h1 className='text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl'>
                      <span className='block text-white uppercase'>Discover soundchain.io</span>
                    </h1>
                    <div className='mt-6 w-full text-xl text-indigo-200'>
                      <div className='flex items-center relative isolate group cursor-pointer'>
                        <div
                          className={`absolute -left-4 w-2 group-hover:w-full
                            transition-all h-6/10 bg-gradient-to-r from-[#FED503] to-[#FE5540] group-hover:rounded-r-lg z-0`} />
                        <span
                          className='text-5xl uppercase align-middle text-white sm:text-6xl lg:text-8xl font-extrabold z-10'>
                            The music
                          </span>

                        <span className='flex-1'></span>
                        <span
                          className='z-10 h-full capitalize transition-all flex items-center text-white font-semibold opacity-0 group-hover:opacity-100 -translate-x-10'>
                          Find your tribe
                        </span>
                      </div>
                      <div className='flex items-center relative isolate group cursor-pointer'>
                        <div
                          className={`absolute -left-4 w-2 group-hover:w-full
                            transition-all h-6/10 bg-gradient-to-r from-[#F1419E] to-[#AC4EFD] group-hover:rounded-r-lg z-0`} />
                        <span
                          className='text-5xl uppercase align-middle text-white sm:text-6xl lg:text-8xl font-extrabold z-10'>
                            Community
                          </span>


                        <span className='flex-1'></span>
                        <span
                          className='z-10 h-full capitalize transition-all flex items-center text-white font-semibold opacity-0 group-hover:opacity-100 -translate-x-10'>
                          Build your tribe
                        </span>
                      </div>
                      <div className='flex items-center relative isolate group cursor-pointer'>
                        <div
                          className={`absolute -left-4 w-2 group-hover:w-full
                            transition-all h-6/10 bg-gradient-to-r from-[#26D1A8] to-[#AC4EFD] group-hover:rounded-r-lg z-0`} />
                        <span
                          className='text-5xl uppercase align-middle text-white sm:text-6xl lg:text-8xl font-extrabold z-10'>
                            Platform
                          </span>


                        <span className='flex-1'></span>
                        <span
                          className='z-10 h-full capitalize transition-all flex items-center text-white font-semibold opacity-0 group-hover:opacity-100 -translate-x-10'>
                          Unleash your music
                        </span>
                      </div>

                    </div>
                    <div className='mt-10 w-full sm:flex sm:justify-start'>
                      <div className='space-y-4 sm:space-y-0 sm:inline-grid sm:grid-cols-2 sm:gap-5'>
                        <Button variant='rainbow' className='rounded-lg' onClick={() => {
                          alert('joining community');
                        }}>
                          <span className='font-medium px-6 uppercase'>Join community for free</span>
                        </Button>
                        <Button variant='outline' bgColor='bg-black/40 hover:bg-black/70'
                                className='rounded-lg border-2' onClick={() => {
                          alert('learning about token');
                        }}>
                          <span className='px-6 uppercase font-bold'>Learn about the token</span>
                        </Button>

                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

    </div>
  );
}
