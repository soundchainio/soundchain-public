import { twd } from '../utils/twd';
import Image from 'next/image';

const blueishBase = twd(`text-transparent bg-clip-text bg-gradient-to-b 
from-[#26D1A8] to-[#AC4EFD]`);

const BlueishText = blueishBase.span;
const BlueishCol = blueishBase(`flex flex-col bg-none bg-[#6FA1FF]`).div;

const SectionWrapper = twd(`max-w-7xl lg:max-w-full mx-auto sm:px-6 mt-56 sm:mt-0 max-h-screen flex flex-col lg:px-0`).div;

export function DiscoverTracksSection() {
  return (
    <>
      <div className='relative h-2'>
        <div
          className='absolute pointer-events-none aspect-video z-0 max-w-[600px] md:max-w-full md:w-full inset-0 h-[830px] -top-[200px] sm:-top-[400px]'>
          <Image
            alt=''
            className='object-contain md:object-cover z-0'
            src='/landing-page/second-section-bg.png'
            layout='fill'
          />

          <div className='relative h-full w-full'>
            <div
              className='absolute inset-0 bg-gradient-radial to-black/25 from-transparent z-0 h-full' />
          </div>
        </div>
      </div>

      <div className='relative z-20 sm:pt-64 sm:pb-64 md:pt-96 md:pb-20'>
        <SectionWrapper className='mt-20 md:mt-0'>
          <div className='container mx-auto h-full flex-1 xl:px-40'>
            <div className='relative flex flex-col items-start h-full pl-4 py-16 md:pl-6 sm:py-24 md:py-32 md:pl-8'>
              <div className='text-center w-full flex flex-col relative mt-20 lg:mt-0'>
                <BlueishText className='text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold'>discover</BlueishText>
                <span className='text-3xl'>high fi tracks</span>
              </div>
              <div className='mt-20 flex w-full'>
                <div className='relative flex justify-center mx-auto'>
                  <div className='absolute inset-0'>
                    <div className='w-full h-full absolute inset-0 flex items-center justify-center rounded-xl z-0 bg-gradient-to-t md:bg-gradient-to-r from-white/50 to-transparent scale-[102%]'>
                      <div className='w-[98%] mx-auto my-auto h-[98%] rounded-xl  bg-gradient-to-t md:bg-gradient-to-r from-slate-600/50 to-transparent p-1'>

                      </div>
                    </div>
                  </div>
                  <div className={`mx:auto w-[360px] md:w-[400px] md:w-[700px] flex flex-col items-start
                  pt-[23rem] md:pt-10 md:h-[360px] md:pl-10 relative rounded-xl bg-gradient-to-t md:bg-gradient-to-r from-slate-900/75 to-transparent`}>
                    <div className='flex items-center gap-4 2xl:ml-10 w-full justify-center md:justify-start'>
                      <span>created</span>
                      <BlueishCol className='text-4xl font-bold'>
                        <span>by</span>
                        <span>for</span>
                      </BlueishCol>
                      <span>artists</span>
                    </div>

                    <span className='max-w-7/10 mt-4 text-center mx-auto md:mx-0 mb-10 md:mb-0'>
                    We support and connect artists like never before with tools to actively engage with fans,
                    and nearly 100% of profits going directly to artists.
                  </span>
                  </div>

                  <div
                    className='absolute pointer-events-none left-0 right-0 -top-[4rem] mx-auto md:left-auto max-w-[190px] md:-right-20  md:-top-10'>
                    <Image
                      alt=''
                      src='/landing-page/timeline-preview.png'
                      className='w-full'
                      width='300px'
                      height='600px'
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </SectionWrapper>
      </div>

      <div className='relative h-2'>
        <div
          className='absolute pointer-events-none aspect-video z-0 max-w-[600px] sm:max-w-full sm:w-full inset-0 h-[830px] -top-[300px] sm:-top-[400px]'>
          <Image
            alt=''
            className='object-contain sm:object-cover z-0'
            src='/landing-page/third-section-bg.png'
            layout='fill'
          />

          <div className='relative h-full w-full'>
            <div
              className='absolute inset-0 bg-gradient-radial to-black/25 from-transparent z-0 h-full' />
          </div>
        </div>
      </div>
    </>
  );
}
