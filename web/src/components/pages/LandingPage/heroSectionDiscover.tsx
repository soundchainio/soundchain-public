import React from 'react';
import Image from 'next/image';
import OutlinedLink from '../../Links/OutlinedLink';
import RainbowLink from '../../Links/RainbowLink';
import { twd } from '../../utils/twd';

const AnimatedBar = twd(`absolute sm:ml-0 md:-left-4 transition-all h-5/10 sm:h-6/10
w-full sm:w-2 sm:group-hover:w-full bg-gradient-to-r group-hover:rounded-r-lg z-0`).span;

const DiscoverFeatureTitle = twd(`w-full sm:w-8/10 text-4xl uppercase align-middle text-white font-extrabold z-10 text-center
sm:text-6xl lg:text-8xl sm:text-left`).span;

const SectionWrapper = twd(`max-w-7xl lg:max-w-full mx-auto max-h-screen flex flex-col lg:px-0`).div;

export function HeroSectionDiscover() {
  return (
    <div className="relative flex flex-col bg-[#131313]">
      <main>
        <div>
          {/* Hero card */}
          <div className="relative">
            <div className="absolute inset-x-0 bottom-0 h-full" />
            <SectionWrapper>
              <div className="relative h-full flex-1">
                <div className="pointer-events-none absolute inset-0 flex h-full justify-start">
                  <Image
                    alt=""
                    className="relative aspect-video h-full w-full object-cover"
                    src="/landing-page/hero-bg.png"
                    fill
                    fetchpriority="high" // Use lowercase fetchpriority
                  />
                  <div className="absolute inset-0 h-full bg-gradient-radial from-transparent via-transparent to-black mix-blend-multiply" />
                  <div className="absolute inset-0 h-full bg-gradient-to-b from-transparent via-transparent to-black mix-blend-multiply" />
                </div>
                <div className="container mx-auto h-full px-10 md:px-0">
                  <div className="relative flex h-full flex-col items-start py-16 pl-4 sm:py-24 sm:pl-6 lg:py-32 lg:pl-8">
                    <h1 className="w-full text-2xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
                      <span className="block text-center uppercase text-white sm:text-left">
                        Discover soundchain.io
                      </span>
                    </h1>
                    <div className="mt-6 w-full text-xl text-indigo-200 sm:px-0 md:px-10">
                      <div className="group relative isolate flex cursor-pointer items-center">
                        <AnimatedBar className={`from-[#FED503] to-[#FE5540]`} />
                        <DiscoverFeatureTitle>The music</DiscoverFeatureTitle>
                        <span className="flex-1" />
                        <span className="z-10 flex hidden h-full -translate-x-10 items-center font-semibold capitalize text-white opacity-0 transition-all group-hover:opacity-100 sm:inline-block">
                          Find your tribe
                        </span>
                      </div>
                      <div className="group relative isolate flex cursor-pointer items-center">
                        <AnimatedBar className={`from-[#F1419E] to-[#AC4EFD]`} />
                        <DiscoverFeatureTitle>Community</DiscoverFeatureTitle>
                        <span className="flex-1" />
                        <span className="z-10 flex hidden h-full -translate-x-10 items-center font-semibold capitalize text-white opacity-0 transition-all group-hover:opacity-100 sm:inline-block">
                          Build your tribe
                        </span>
                      </div>
                      <div className="group relative isolate flex cursor-pointer items-center">
                        <AnimatedBar className={`from-[#26D1A8] to-[#AC4EFD]`} />
                        <DiscoverFeatureTitle>Platform</DiscoverFeatureTitle>
                        <span className="flex-1" />
                        <span className="z-10 flex hidden h-full -translate-x-10 items-center font-semibold capitalize text-white opacity-0 transition-all group-hover:opacity-100 sm:inline-block">
                          Unleash your music
                        </span>
                      </div>
                    </div>
                    <div className="mt-10 w-full sm:flex sm:justify-start md:px-10 lg:px-0">
                      <div className="space-y-4 sm:inline-grid sm:grid-cols-2 sm:gap-5 sm:space-y-0">
                        <RainbowLink
                          href="/login"
                          containerClassName="rounded-lg"
                          className="md:text-md rounded-lg text-center text-sm font-medium uppercase"
                        >
                          Join community for free
                        </RainbowLink>
                        <OutlinedLink
                          href="/ogun"
                          bgColor="bg-black/40 py-3 hover:bg-slate-900/70"
                          className="rounded-lg border-2 text-center font-bold font-medium uppercase"
                        >
                          Learn about the token
                        </OutlinedLink>
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
