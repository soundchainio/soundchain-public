import SEO from '../components/SEO'
import { ReactElement } from 'react'
import RoadmapLayout from '../components/roadmap/layout'

export default function RoadmapPage() {
  return (
    <>
      <SEO title="SoundChain Roadmap" description="SoundChain Roadmap" canonicalUrl="/roadmap" />

      <footer className="w-full bg-[#131313] text-[#505050]">
        <div className="container mx-auto flex h-[60px] items-center justify-center">
          <span className="font-bold">SoundChain. {new Date().getFullYear()} - MADE BY AE.STUDIO</span>
        </div>
      </footer>
    </>
  )
}

RoadmapPage.getLayout = (page: ReactElement) => <RoadmapLayout>{page}</RoadmapLayout>
