import { RoadmapStepList } from 'components/roadmap/roadmapStep'
import { roadmapSteps } from '../roadmap/roadmap.config'
import RainbowLink from '../Links/RainbowLink'

export function RoadmapSection() {
  return (
    <div className="relative">
      <div
        className="flex max-h-screen
       min-h-[500px] max-w-7xl
              flex-col lg:max-w-full vsm:min-h-[600px]"
      >
        <div className="mx-auto h-full flex-1">
          <div className="relative flex h-full flex-col items-start sm:py-24 lg:py-32">
            <div className="relative flex w-full flex-col text-center" id="roadmap">
              <h1 className="mt-14 text-4xl font-bold text-white md:mt-0 md:text-5xl lg:text-6xl xl:text-7xl">
                What is next?
              </h1>
            </div>
            <div className="md:max-w-screen mx-auto mt-20 flex w-full w-screen max-w-15/16 flex-col sm:pr-2 md:max-w-full 2k:max-w-[1200px]">
              <RoadmapStepList steps={roadmapSteps.slice(0, 3)} />
            </div>
            <div className="mt-10 flex w-full justify-center">
              <RainbowLink href="/roadmap" containerClassName="rounded-lg" className="rounded-lg text-center">
                <span className="px-6 font-medium uppercase">See full roadmap</span>
              </RainbowLink>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
