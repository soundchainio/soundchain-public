import { ReactNode } from 'react';
import { HeroSectionDiscover } from './heroSectionDiscover';
import { MintSongsSection } from './mintSongsSection';
import { DiscoverTracksSection } from './discoverTracksSection';
import { CollectMusicNFTSection } from './collectMusicNFTSection';
import { RoadmapSection } from './roadmapSection';

export interface LayoutProps {
  children: ReactNode | undefined;
}

export default function LandingPageLayout({ children }: LayoutProps) {
  return (
    <div className='relative h-full flex bg-black flex-col text-white overflow-x-hidden font-rubik'>
      <HeroSectionDiscover />
      <MintSongsSection />
      <DiscoverTracksSection />

      <CollectMusicNFTSection />
      <RoadmapSection />

      {children}
    </div>
  );
}