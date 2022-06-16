import { twd } from '../utils/twd';
import Image from 'next/image';

const greenishBase = twd(`text-transparent bg-clip-text bg-gradient-to-b 
from-[#26D1A8] via-[#77F744] to-[#FED503]`);

const GreenishText = greenishBase.span;
const GreenishBorder = greenishBase(`absolute -left-4 h-full w-1 bg-clip-border`).div;

const SectionWrapper = twd(`max-w-7xl lg:max-w-full mx-auto sm:px-6 lg:px-0 max-h-[670px] md:max-h-[850px] flex flex-col sm:pt-20`).div


export function MintSongsSection() {
  return (
    <>
      <div className='relative'>
        <div className='absolute pointer-events-none top-40 sm:top-32 z-10 h-[500px] w-full'>
          <Image
            alt=''
            className='object-cover z-30 max-h-[300px] w-full object-cover'
            src='/landing-page/wave-bg.svg'
            layout='responsive'
            width='1511px'
            height='387px'
          />
        </div>
      </div>

      <div className='relative z-10'>
        <SectionWrapper>
          <div className='container mx-auto h-full flex-1 xl:px-40'>
            <div className='relative flex flex-col items-center md:items-start h-full pl-4 py-16 md:pl-6 lg:pl-8'>
              <div className='text-center w-full flex flex-col relative'>
                <GreenishText className='text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold'>quickly</GreenishText>
                <span className='text-3xl'>mint songs on the blockchain</span>
              </div>
              <div className='flex flex-col lg:flex-row mt-56'>
                <div className='flex flex-col min-w-[400px]'>
                  <span className='text-white font-semibold text-3xl text-center md:text-left'>Mint NFTs on</span>
                  <div className='text-7xl text-[#77F744] flex flex-row mx-auto md:mx-0 py-3'>
                    <span>polygon</span>
                  </div>
                  <span className='text-white font-semibold text-3xl text-center md:text-left'>blockchain</span>
                </div>

                <div className='text-center text-white md:hidden py-2'>
                  <div className='max-w-full min-w-0 text-wrap px-2'>Our native ERC-20 token that lets our users take part in</div>
                  <div className='max-w-full min-w-0 text-wrap py-2'>shaping the {`platform's`} future.</div>
                </div>

                <div className='flex flex-col'>
                  <div className='text-center text-white hidden md:inline-block px-2'>
                    <div className='px-2'>Our native ERC-20 token that lets our users take part in</div>
                    <div>shaping the {`platform's`} future.</div>
                  </div>

                  <div className='min-h-[830px] sm:min-h-[670px] md:min-h-[630px]'>
                    <div className='flex flex-col lg:grid lg:grid-cols-3 gap-4 mt-10 px-6 sm:px-0'>
                      <div className='col-span-1 flex flex-col relative'>
                        <GreenishBorder />

                        <span className='text-white text-2xl uppercase'>Simple <span className='hidden sm:block'/>to use</span>
                        <span className='text-slate-300 mt-2 max-w-8/10'>You {`shouldn't`} need to lawyer up over the banger you just made</span>
                      </div>
                      <div className='col-span-1 flex flex-col relative'>
                        <GreenishBorder />

                        <span className='text-white text-2xl uppercase'>full <span className='hidden sm:block'/>ownership</span>
                        <span className='text-slate-300 mt-2 max-w-8/10'>Get full control over how your work is used and where</span>
                      </div>
                      <div className='col-span-1 flex flex-col relative'>
                        <GreenishBorder />

                        <span className='text-white text-2xl uppercase'>your music <span className='hidden sm:block'/>earns more</span>
                        <span className='text-slate-300 mt-2 max-w-8/10'>Blockchain hosting means you get paid directly per stream</span>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>
        </SectionWrapper>
      </div>
    </>
  );
}
