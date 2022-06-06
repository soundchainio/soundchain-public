import { twd } from '../utils/twd';
import Image from 'next/image';

const orngBash = twd(`text-transparent bg-clip-text bg-gradient-to-b 
from-[#FED503] to-[#FE5540]`);

const OrngText = orngBash.span;
const OrngCol = orngBash(`flex flex-row gap-4 sm:gap-0 sm:flex-col items-center justify-center sm:items-start sm:justify-start bg-none bg-[#FED503]`).div;

const SectionWrapper = twd(`max-w-7xl lg:max-w-full mx-auto sm:px-6 mt-56 sm:mt-0 max-h-screen flex flex-col lg:px-0`).div;

export function CollectMusicNFTSection() {
  return (
    <div className='relative'>
      <SectionWrapper className=''>
        <div className='container mx-auto h-full flex-1 xl:px-40'>
          <div className='relative flex flex-col items-start h-full md:pl-4 py-16 md:pl-6 md:py-24 lg:py-32 lg:pl-8'>
            <div className='text-center w-full flex flex-col relative w-full'>
              <OrngText className='text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold'>collect</OrngText>
              <span className='text-3xl'>exclusive music NFTs</span>
            </div>
            <div className='mt-20 flex flex-col-reverse md:flex-row items-center w-full'>

              <div className='mt-10 flex flex-col min-w-[400px] items-center'>
                <span className='text-white font-semibold text-center md:text-left text-2xl md:text-3xl'>Full ownership over how</span>
                <OrngCol className='text-7xl uppercase'>
                  <span>your</span>
                  <span>art</span>
                </OrngCol>
                <span className='text-white font-semibold text-center md:text-left text-3xl'>is used</span>
              </div>
              <div className='max-w-[300px] -ml-10 md:ml-0 md:max-w-[584px]'>
                <Image
                  layout='intrinsic'
                  width='584px'
                  height='544px'
                  className='h-full w-full object-contain'
                  src='/landing-page/laptop.png' />
              </div>
            </div>
          </div>
        </div>
      </SectionWrapper>
    </div>
  );
}
