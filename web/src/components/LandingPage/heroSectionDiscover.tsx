import Image from 'next/image';
import { Button } from '../Button';
import { twd } from '../utils/twd';
import LandingPageHeader from './header';
import React from 'react';

const AnimatedBar = twd(`absolute ml-2 sm:ml-0 -left-4 transition-all h-5/10 sm:h-6/10
w-full sm:w-2 sm:group-hover:w-full bg-gradient-to-r group-hover:rounded-r-lg z-0`).span;

const DiscoverFeatureTitle = twd(`w-full sm:w-8/10 text-4xl uppercase align-middle text-white font-extrabold z-10 text-center
sm:text-6xl lg:text-8xl sm:text-left`).span;

const SectionWrapper = twd(`max-w-7xl lg:max-w-full mx-auto max-h-screen flex flex-col lg:px-0`).div;

export function HeroSectionDiscover() {
  return (
    <div className='bg-[#131313] relative flex flex-col'>
      <LandingPageHeader />

      <main>
        <div>
          {/* Hero card */}
          <div className='relative'>
            <div className='absolute inset-x-0 bottom-0 h-full' />
            <SectionWrapper>
              <div className='relative h-full flex-1'>
                <div className='absolute inset-0 h-full pointer-events-none flex justify-start'>
                  <Image
                    className='h-full w-full aspect-video relative object-cover'
                    src='/landing-page/hero-bg.png'
                    layout='fill'
                  />
                  <div
                    className='absolute inset-0 from-transparent via-transparent to-black bg-gradient-radial h-full mix-blend-multiply' />
                  <div
                    className='absolute inset-0 from-transparent via-transparent to-black bg-gradient-to-b h-full mix-blend-multiply' />
                </div>
                <div className='container mx-auto h-full px-10 md:px-0'>
                  <div
                    className='relative flex flex-col items-start h-full pl-4 py-16 sm:pl-6 sm:py-24 lg:py-32 lg:pl-8'>
                    <h1 className='font-extrabold tracking-tight text-2xl sm:text-5xl lg:text-6xl w-full'>
                      <span
                        className='block text-white uppercase text-center sm:text-left'>Discover soundchain.io</span>
                    </h1>
                    <div className='mt-6 w-full px-10 sm:px-0 text-xl text-indigo-200'>
                      <div className='flex items-center relative isolate group cursor-pointer'>
                        <AnimatedBar className={` from-[#FED503] to-[#FE5540]`} />
                        <DiscoverFeatureTitle>
                          The music
                        </DiscoverFeatureTitle>

                        <span className='flex-1'/>
                        <span
                          className='z-10 h-full hidden sm:inline-block capitalize transition-all flex items-center text-white font-semibold opacity-0 group-hover:opacity-100 -translate-x-10'>
                          Find your tribe
                        </span>
                      </div>
                      <div className='flex items-center relative isolate group cursor-pointer'>
                        <AnimatedBar
                          className={` from-[#F1419E] to-[#AC4EFD]`} />
                        <DiscoverFeatureTitle>
                          Community
                        </DiscoverFeatureTitle>


                        <span className='flex-1' />
                        <span
                          className='z-10 h-full capitalize hidden sm:inline-block transition-all flex items-center text-white font-semibold opacity-0 group-hover:opacity-100 -translate-x-10'>
                          Build your tribe
                        </span>
                      </div>
                      <div className='flex items-center relative isolate group cursor-pointer'>
                        <AnimatedBar
                          className={`from-[#26D1A8] to-[#AC4EFD]`} />
                        <DiscoverFeatureTitle>
                          Platform
                        </DiscoverFeatureTitle>


                        <span className='flex-1' />
                        <span
                          className='z-10 h-full capitalize hidden sm:inline-block transition-all flex items-center text-white font-semibold opacity-0 group-hover:opacity-100 -translate-x-10'>
                          Unleash your music
                        </span>
                      </div>

                    </div>
                    <div className='mt-10 w-full px-10 sm:px-0 sm:flex sm:justify-start'>
                      <div className='space-y-4 sm:space-y-0 sm:inline-grid sm:grid-cols-2 sm:gap-5'>
                        <Button
                          as={'a'}
                          href='/login'
                          variant='rainbow'
                          className='rounded-lg'>
                          <span className='font-medium px-6 uppercase text-center'>Join community for free</span>
                        </Button>

                        <Button
                          as={'a'}
                          href='/ogun'
                          variant='outline'
                          bgColor='bg-black/40 py-3 hover:bg-slate-900/70'
                          className='rounded-lg border-2'>
                            <span
                              className='px-6 uppercase font-bold font-medium text-center'>Learn about the token</span>
                        </Button>

                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </SectionWrapper>
          </div>
        </div>
      </main>

    </div>
  );
}
