import Image from 'next/image'

import { twd } from '../../utils/twd'

const blueishBase = twd(`text-transparent bg-clip-text bg-gradient-to-b 
from-[#26D1A8] to-[#AC4EFD]`)

const BlueishText = blueishBase.span
const BlueishCol = blueishBase(`flex flex-col bg-none bg-[#6FA1FF]`).div

const SectionWrapper = twd(
  `max-w-7xl lg:max-w-full mx-auto sm:px-6 mt-56 sm:mt-0 max-h-screen flex flex-col lg:px-0`,
).div

export function DiscoverTracksSection() {
  return (
    <>
      <div className="relative h-2 md:py-10 lg:py-0">
        <div className="pointer-events-none absolute inset-0 -top-[200px] z-0 aspect-video h-[830px] max-w-[600px] sm:-top-[400px] md:w-full md:max-w-full">
          <Image
            alt=""
            className="z-0 object-contain md:object-cover"
            src="/landing-page/second-section-bg.png"
            layout="fill"
          />

          <div className="relative h-full w-full">
            <div className="absolute inset-0 z-0 h-full bg-gradient-radial from-transparent to-black/25" />
          </div>
        </div>
      </div>

      <div className="relative z-20">
        <SectionWrapper className="md:mt-0">
          <div className="container mx-auto h-full flex-1 xl:px-40">
            <div className="relative flex h-full flex-col items-start py-16 pl-4 sm:py-24 md:py-32 md:pl-6 md:pl-8">
              <div className="relative mt-20 flex w-full flex-col text-center lg:mt-0">
                <BlueishText className="text-4xl font-bold md:text-5xl lg:text-6xl xl:text-7xl">discover</BlueishText>
                <span className="text-3xl">high fi tracks</span>
              </div>
              <div className="mt-20 flex w-full">
                <div className="relative mx-auto flex justify-center">
                  <div className="absolute inset-0">
                    <div className="absolute inset-0 z-0 flex h-full w-full scale-[102%] items-center justify-center rounded-xl bg-gradient-to-t from-white/50 to-transparent md:bg-gradient-to-r">
                      <div className="mx-auto my-auto h-[98%] w-[98%] rounded-xl  bg-gradient-to-t from-slate-600/50 to-transparent p-1 md:bg-gradient-to-r"></div>
                    </div>
                  </div>
                  <div
                    className={`mx:auto relative flex w-[360px] flex-col items-start rounded-xl
                  bg-gradient-to-t from-slate-900/75 to-transparent pt-[23rem] md:h-[360px] md:w-[400px] md:w-[700px] md:bg-gradient-to-r md:pt-10 md:pl-10`}
                  >
                    <div className="flex w-full items-center justify-center gap-4 md:justify-start 2xl:ml-10">
                      <span>created</span>
                      <BlueishCol className="text-4xl font-bold">
                        <span>by</span>
                        <span>for</span>
                      </BlueishCol>
                      <span>artists</span>
                    </div>

                    <span className="mx-auto mt-4 mb-10 max-w-7/10 text-center md:mx-0 md:mb-0">
                      We support and connect artists like never before with tools to actively engage with fans, and
                      nearly 100% of profits going directly to artists.
                    </span>
                  </div>

                  <div className="pointer-events-none absolute left-0 right-0 -top-[4rem] mx-auto max-w-[190px] md:left-auto md:-right-20  md:-top-10">
                    <Image
                      alt=""
                      src="/landing-page/timeline-preview.png"
                      className="w-full"
                      width={300}
                      height={600}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </SectionWrapper>
      </div>

      <div className="relative h-2">
        <div className="pointer-events-none absolute inset-0 -top-[300px] z-0 aspect-video h-[830px] max-w-[600px] sm:-top-[400px] sm:w-full sm:max-w-full">
          <Image
            alt=""
            className="z-0 object-contain sm:object-cover"
            src="/landing-page/third-section-bg.png"
            layout="fill"
          />

          <div className="relative h-full w-full">
            <div className="absolute inset-0 z-0 h-full bg-gradient-radial from-transparent to-black/25" />
          </div>
        </div>
      </div>
    </>
  )
}
