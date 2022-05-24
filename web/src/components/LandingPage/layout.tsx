import { ReactNode } from 'react';
import { HeroSectionDiscover } from './heroSectionDiscover';
import { MintSongsSection } from './mintSongsSection';
import { DiscoverTracksSection } from './discoverTracksSection';
import { CollectMusicNFTSection } from './collectMusicNFTSection';
import { RoadmapSection } from './roadmapSection';
import Image from 'next/image';

export interface LayoutProps {
  children: ReactNode | undefined;
}

export default function LandingPageLayout({ children }: LayoutProps) {
  return (
    <div className='relative h-full flex bg-black flex-col text-white overflow-x-hidden font-rubik'>
      <HeroSectionDiscover />
      <div className='relative h-[300px]'>
        <div className='absolute aspect-video z-10 w-full inset-0 h-[400px] -top-[150px]'>
          <Image
            className='object-cover z-10'
            src='/landing-page/wave-bg.svg'
            alt='Wave background'
            layout='fill'
          />
        </div>
      </div>
      <MintSongsSection />

      <div className='relative h-2'>
        <div className='absolute aspect-video z-0 w-full inset-0 h-[830px] -top-[650px]'>
          <Image
            className='object-cover z-0 opacity-75'
            src='/landing-page/second-section-bg.png'
            alt='Man looking at music editing software on a studio'
            layout='fill'
          />

          <div className='relative h-full w-full'>
            <div
              className='absolute inset-0 bg-gradient-radial from-black to-transparent z-0 h-full mix-blend-multiply' />
          </div>
        </div>
      </div>

      <DiscoverTracksSection />
      <div className='relative h-2'>
        <div
          className='absolute aspect-video z-0 w-full inset-0 h-[830px] -top-[650px] bg-gradient-to-b from-black to-transparent'>
          <Image
            className='object-cover z-0 opacity-75'
            src='/landing-page/third-section-bg.png'
            alt='Man looking at music editing equipment on a studio'
            layout='fill'
          />
        </div>
      </div>
      <CollectMusicNFTSection />
      <RoadmapSection />

      {children}
    </div>
  );
}