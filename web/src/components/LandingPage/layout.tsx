import { ReactNode } from 'react'
import { HeroSectionDiscover } from './heroSectionDiscover'
import { MintSongsSection } from './mintSongsSection'
import { DiscoverTracksSection } from './discoverTracksSection'
import { CollectMusicNFTSection } from './collectMusicNFTSection'
import { RoadmapSection } from './roadmapSection'

export interface LayoutProps {
  children: ReactNode | undefined
}

export default function LandingPageLayout({ children }: LayoutProps) {
  return (
    <div className="relative flex h-full flex-col overflow-x-hidden bg-black font-rubik text-white">
      <HeroSectionDiscover />
      <MintSongsSection />
      <DiscoverTracksSection />

      <CollectMusicNFTSection />
      <RoadmapSection />

      {children}
    </div>
  )
}
