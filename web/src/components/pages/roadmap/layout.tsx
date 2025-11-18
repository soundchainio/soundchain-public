import { ReactElement } from 'react'

import LandingPageHeader from 'components/pages/LandingPage/Header/header'
import Image from 'next/image'

import { roadmapSteps } from './roadmap.config'
import { RoadmapStepList } from './roadmapStep'

interface RoadmapLayoutProps {
  children: ReactElement
}

export default function RoadmapLayout(props: RoadmapLayoutProps) {
  return (
    <div className="relative flex h-full flex-col overflow-x-hidden bg-black font-rubik text-white">
      <div className="relative flex flex-col bg-[#131313]">
        <LandingPageHeader />
      </div>

      <div className="lg:container">
        <div className="relative h-[400px] w-full sm:h-[500px] md:h-[600px] lg:h-[700]">
          <Image
            src="/landing-page/roadmap-background.svg"
            
            
            fill
            className="object-cover "
            alt="roadmap background"
          />

          <div className="absolute inset-0 flex h-full w-full items-center justify-center">
            <span className="text-center text-3xl font-bold sm:text-4xl md:text-6xl">
              SOUNDCHAIN
              <br />
              ROADMAP
            </span>
          </div>
        </div>
      </div>

      <div className="relative">
        <div
          className={` md:max-w-screen mx-auto flex w-screen max-w-15/16 flex-col 
        pb-10 sm:pr-2 md:max-w-full md:pb-20 2k:max-w-[1200px]`}
        >
          <RoadmapStepList steps={roadmapSteps} />
        </div>
      </div>

      {props.children}
    </div>
  )
}
