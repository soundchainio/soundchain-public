import { twd } from '../utils/twd';

const greenishBase = twd(`text-transparent bg-clip-text bg-gradient-to-b 
from-[#26D1A8] via-[#77F744] to-[#FED503]`);

const GreenishText = greenishBase.span;
const GreenishCol = greenishBase(`flex flex-col`).div;
const GreenishBorder = greenishBase(`absolute -left-4 h-full w-1 bg-clip-border`).div;

export function MintSongsSection() {
  return (
    <div className='relative z-10'>
      <div className='max-w-7xl lg:max-w-full mx-auto sm:px-6 lg:px-0 min-h-[500px]
             vsm:min-h-[600px] vmd:min-h-[750px] vlg:min-h-[900px] vxl:min-h-[1100px] v2xl:min-h-[1400px]
              max-h-screen flex flex-col'>
        <div className='container mx-auto h-full flex-1 xl:px-40'>
          <div className='relative flex flex-col items-start h-full pl-4 py-16 sm:pl-6 sm:py-24 lg:py-32 lg:pl-8'>
            <div className='text-center w-full flex flex-col relative'>
              <GreenishText className='text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold'>quickly</GreenishText>
              <span className='text-3xl'>mint songs on the blockchain</span>
            </div>
            <div className='flex mt-20'>
              <div className='flex flex-col min-w-[400px]'>
                <span className='text-white font-semibold text-3xl'>Mint NFTs on</span>
                <GreenishCol className='text-7xl'>
                  <span>pol</span>
                  <span>yg</span>
                  <span>on</span>
                </GreenishCol>
                <span className='text-white font-semibold text-3xl'>blockchain</span>
              </div>

              <div className='flex flex-col'>
                <div className='text-center text-white'>
                  <div>Our native ER-20 token that lets our users take part in</div>
                  <div>shaping the {`platform's`} future.</div>
                </div>

                <div className='grid grid-cols-3 gap-4 mt-10'>
                  <div className='col-span-1 flex flex-col relative'>
                    <GreenishBorder />

                    <span className='text-white text-2xl uppercase'>Simple<br />to use</span>
                    <span className='text-slate-300 mt-2 max-w-8/10'>You {`shouldn't`} need to lawyer up over the banger you just made</span>
                  </div>
                  <div className='col-span-1 flex flex-col relative'>
                    <GreenishBorder />

                    <span className='text-white text-2xl uppercase'>full<br />ownership</span>
                    <span className='text-slate-300 mt-2 max-w-8/10'>Get full control over how your work is used and where</span>
                  </div>
                  <div className='col-span-1 flex flex-col relative'>
                    <GreenishBorder />

                    <span className='text-white text-2xl uppercase'>your music<br />earns more</span>
                    <span className='text-slate-300 mt-2 max-w-8/10'>Blockchain hosting means you get paid directly per stream</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
