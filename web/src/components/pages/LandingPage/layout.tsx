import { ReactNode } from 'react'
import dynamic from 'next/dynamic'
import { HeroSectionDiscover } from './heroSectionDiscover'
import { MintSongsSection } from './mintSongsSection'
import { DiscoverTracksSection } from './discoverTracksSection'
import { CollectMusicNFTSection } from './collectMusicNFTSection'
import { RoadmapSection } from './roadmapSection'
import { SocialMediaMenu } from './SocialMediaMenu'

// Load header client-side only to avoid GraphQL hook SSR issues
const LandingPageHeader = dynamic(() => import('./Header/header'), { ssr: false })

export interface LayoutProps {
  children: ReactNode | undefined
}

export default function LandingPageLayout({ children }: LayoutProps) {
  return (
    <div className="relative flex h-full flex-col overflow-x-hidden bg-black font-rubik text-white">
      <LandingPageHeader />
      <SocialMediaMenu />
      <HeroSectionDiscover />
      <MintSongsSection />
      <DiscoverTracksSection />

      <CollectMusicNFTSection />
      <RoadmapSection />

      {children}
    </div>
  )
}
