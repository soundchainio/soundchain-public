import { twd } from '../utils/twd';

const blueishBase = twd(`text-transparent bg-clip-text bg-gradient-to-b 
from-[#26D1A8] to-[#AC4EFD]`);

const GreenishText = blueishBase.span;
const BlueishCol = blueishBase(`flex flex-col bg-none bg-[#6FA1FF]`).div;

export function DiscoverTracksSection() {
  return (
    <div className='relative'>
      <div className='max-w-7xl lg:max-w-full mx-auto sm:px-6 lg:px-0 min-h-[500px]
             vsm:min-h-[600px] vmd:min-h-[750px] vlg:min-h-[900px] vxl:min-h-[1100px] v2xl:min-h-[1400px]
              max-h-screen flex flex-col'>
        <div className='container mx-auto h-full flex-1 xl:px-40'>
          <div className='relative flex flex-col items-start h-full pl-4 py-16 sm:pl-6 sm:py-24 lg:py-32 lg:pl-8'>
            <div className='text-center w-full flex flex-col relative'>
              <GreenishText className='text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold'>discover</GreenishText>
              <span className='text-3xl'>high fi tracks</span>
            </div>
            <div className='mt-20'>
              <div className='relative flex'>
                <div
                  className='absolute isolate inset-0 z-0 rounded-lg from-white/25 border border-white to-transparent via-black/25 mix-blend-overlay bg-gradient-to-l -rotate-180' />
                <div className='pt-20 flex flex-col px-10 pb-20 w-[500px] 2xl:w-[700px] z-20'>
                  <div className='flex items-center gap-4 2xl:ml-10'>
                    <span>created</span>
                    <BlueishCol className='text-4xl font-bold'>
                      <span>by</span>
                      <span>for</span>
                    </BlueishCol>
                    <span>artists</span>
                  </div>

                  <span className='max-w-7/10 mt-4 text-center'>
                    We support and connect artists like never before with tools to actively engage with fans,
                    and nearly 100% of profits going directly to artists.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
