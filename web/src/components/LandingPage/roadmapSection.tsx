import { twd } from '../utils/twd';
import { ArrowRightIcon } from '@heroicons/react/solid';
import { Disclosure, Transition } from '@headlessui/react';
import { Button } from '../Button';
import { ReactElement } from 'react';
import Link from 'next/link';

const RoadmapStepTitle = twd(`font-bold text-lg sm:text-3xl md:text-6xl uppercase`).h2;
const RoadmapStepStatus = twd(`font-semibold  text-sm sm:text-lg md:text-xl`).span;
const RoadmapButton = twd(`flex items-center py-4 px-2 md:px-10 text-black bg-[#FE5540]`).as(Disclosure.Button);
const RoadmapPanel = twd(`border-x-4 py-4 px-4 border-[#FE5540]`).as(Disclosure.Panel);

type RoadmapFragments = 'button' | 'status' | 'panel' | 'title';

interface RoadmapStepProps {
  title: string;
  status: string;
  children: string | ReactElement;

  styles: Partial<Record<RoadmapFragments, string>>;
}

function RoadmapStep({ title, status, children, styles }: RoadmapStepProps) {
  return (
    <Disclosure>
      <RoadmapButton className={`${styles?.button}`}>
        <RoadmapStepTitle className={styles?.title}>{title}</RoadmapStepTitle>
        <div className='flex-1' />
        <RoadmapStepStatus className={styles?.status}>{status}</RoadmapStepStatus>
        <ArrowRightIcon className='w-6 h-6 ml-4' />
      </RoadmapButton>
      <Transition
        enter='transition duration-500 ease-out delay-150'
        enterFrom='transform scale-y-0 translate-y-[100%] opacity-0'
        enterTo='transform scale-y-100 translate-y-0 opacity-100'
        leave='transition duration-300 ease-out delay-150'
        leaveFrom='transform scale-y-100 translate-y-0 -translate-x-0 opacity-100'
        leaveTo='transform scale-y-0 translate-y-0 -translate-x-[100%] opacity-0'>
        <RoadmapPanel className={` ${styles?.panel}`}>
          {children}
        </RoadmapPanel>
      </Transition>
    </Disclosure>
  );
}

export function RoadmapSection() {
  return (
    <div className='relative'>
      <div className='max-w-7xl lg:max-w-full
       min-h-[500px] vsm:min-h-[600px]
              max-h-screen flex flex-col'>
        <div className='mx-auto h-full flex-1'>
          <div className='relative flex flex-col items-start h-full sm:py-24 lg:py-32'>
            <div className='text-center w-full flex flex-col relative' id='roadmap'>
              <h1 className='text-4xl text-white md:text-5xl lg:text-6xl xl:text-7xl font-bold'>What is next?</h1>
            </div>
            <div
              className='mt-20 flex flex-col w-full max-w-15/16 md:max-w-full w-screen mx-auto sm:pr-2 md:max-w-screen 2k:max-w-[1200px]'>
              <RoadmapStep title='UI/UX updates' status='In progress' styles={{
                button: 'bg-[#FE5540]',
                panel: `border-[#FE5540]`,
              }}>
                We’re improving the UI/UX of the whole platform, focusing on high traffic areas of the site as well
                as improvements to shared components. There’s also a conscious focus on improving the desktop experience
                as well. The changes include improvements to the marketplace page, the track listing pages, the users
                page, the music player, and the general layout of the site
              </RoadmapStep>
              <RoadmapStep title='Token Launch' status='Jun 21, 2022' styles={{
                button: 'bg-[#FED503]',
                panel: `border-[#FED503]`,
              }}>
                Token launch, complete with Airdrop, Staking, and Liquidity pool rewards. Also launching with tight
                platform integration to let you buy and sell with OGUN, with extra trading rewards if you do
              </RoadmapStep>

              <RoadmapStep
                title='Multi-Edition NFTs'
                status='July/August'
                styles={{
                  button: 'bg-[#AC4EFD]',
                  panel: `border-[#AC4EFD] border-b-2`,
                }}>

                Giving you the ability to mint and sell multiple editions of your NFTs. Be able to sell multiple
                copies of your track
              </RoadmapStep>
            </div>
            <div className='mt-10 flex justify-center w-full'>
              <Link href='/roadmap'>
                <Button variant='rainbow' className='rounded-lg'>
                  <span className='font-medium px-6 uppercase'>See full roadmap</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
