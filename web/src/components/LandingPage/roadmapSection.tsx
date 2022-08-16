import { RoadmapStepList } from 'components/roadmap/roadmapStep';
import { roadmapSteps } from '../roadmap/roadmap.config';
import RainbowLink from '../Links/RainbowLink';

export function RoadmapSection() {
  return (
    <div className='relative'>
      <div className='max-w-7xl lg:max-w-full
       min-h-[500px] vsm:min-h-[600px]
              max-h-screen flex flex-col'>
        <div className='mx-auto h-full flex-1'>
          <div className='relative flex flex-col items-start h-full sm:py-24 lg:py-32'>
            <div className='text-center w-full flex flex-col relative' id='roadmap'>
              <h1 className='text-4xl text-white md:text-5xl lg:text-6xl xl:text-7xl font-bold mt-14 md:mt-0'>What is next?</h1>
            </div>
            <div
              className='mt-20 flex flex-col w-full max-w-15/16 md:max-w-full w-screen mx-auto sm:pr-2 md:max-w-screen 2k:max-w-[1200px]'>
              <RoadmapStepList steps={roadmapSteps.slice(0, 3)} />
            </div>
            <div className='mt-10 flex justify-center w-full'>
              <RainbowLink
                  href='/roadmap'
                  containerClassName='rounded-lg'
                  className='rounded-lg text-center'>
                <span className='font-medium px-6 uppercase'>See full roadmap</span>
              </RainbowLink>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
