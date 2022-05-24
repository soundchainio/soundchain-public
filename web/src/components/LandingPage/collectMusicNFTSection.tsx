import { twd } from '../utils/twd';
import Image from 'next/image';

const orngBash = twd(`text-transparent bg-clip-text bg-gradient-to-b 
from-[#FED503] to-[#FE5540]`);

const OrngText = orngBash.span;
const OrngCol = orngBash(`flex flex-col bg-none bg-[#FED503]`).div;

export function CollectMusicNFTSection() {
  return (
    <div className='relative'>
      <div className='max-w-7xl lg:max-w-full mx-auto sm:px-6 lg:px-0 min-h-[500px]
             vsm:min-h-[600px] vmd:min-h-[750px] vlg:min-h-[900px] vxl:min-h-[1100px] v2xl:min-h-[1400px]
              max-h-screen flex flex-col'>
        <div className='container mx-auto h-full flex-1 xl:px-40'>
          <div className='relative flex flex-col items-start h-full pl-4 py-16 sm:pl-6 sm:py-24 lg:py-32 lg:pl-8'>
            <div className='text-center w-full flex flex-col relative'>
              <OrngText className='text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold'>collect</OrngText>
              <span className='text-3xl'>exclusive music NFTs</span>
            </div>
            <div className='mt-20 flex items-center'>

              <div className='mt-10 flex flex-col min-w-[400px]'>
                <span className='text-white font-semibold text-3xl'>Full ownership over how</span>
                <OrngCol className='text-7xl uppercase'>
                  <span>your</span>
                  <span>art</span>
                </OrngCol>
                <span className='text-white font-semibold text-3xl'>is used</span>
              </div>
              <div className='max-w-[584px]'>
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
      </div>
    </div>
  );
}
