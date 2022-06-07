import Image from 'next/image';
import { ReactElement } from 'react';
import LandingPageHeader from '../LandingPage/header';
import { RoadmapStepList } from './roadmapStep';
import { roadmapSteps } from './roadmap.config';

interface RoadmapLayoutProps {
  children: ReactElement;
}

export default function RoadmapLayout(props: RoadmapLayoutProps) {
  return (
    <div className='relative h-full flex bg-black flex-col text-white overflow-x-hidden font-rubik'>
      <div className='relative flex flex-col bg-[#131313]'>
        <LandingPageHeader />
      </div>

      <div className='lg:container'>
        <div className='relative w-full h-[400px] sm:h-[500px] md:h-[600px] lg:h-[700]'>
          <Image
            src='/landing-page/roadmap-background.svg'
            width={1488}
            height={952}
            layout='fill'
            className='object-cover '
          />


          <div className='absolute inset-0 w-full h-full flex items-center justify-center'>
            <span className='text-3xl sm:text-4xl md:text-6xl font-bold text-center'>SOUNDCHAIN<br />ROADMAP</span>
          </div>
        </div>
      </div>


      <div className='relative'>
        <div className={` flex flex-col w-full max-w-15/16 md:max-w-full w-screen mx-auto 
        sm:pr-2 md:max-w-screen 2k:max-w-[1200px] pb-10 md:pb-20`}>
          <RoadmapStepList steps={roadmapSteps} />
        </div>
      </div>

      {props.children}
    </div>
  );
}