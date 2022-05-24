import { twd } from '../utils/twd';
import { ArrowRightIcon } from '@heroicons/react/solid';
import { Disclosure } from '@headlessui/react';
import { Button } from '../Button';

const orngBash = twd(`text-transparent bg-clip-text bg-gradient-to-b 
from-[#FED503] to-[#FE5540]`);

const OrngText = orngBash.span;

export function RoadmapSection() {
  return (
    <div className='relative'>
      <div className='max-w-7xl lg:max-w-full
       min-h-[500px] vsm:min-h-[600px]
              max-h-screen flex flex-col'>
        <div className='mx-auto h-full flex-1'>
          <div className='relative flex flex-col items-start h-full sm:py-24 lg:py-32'>
            <div className='text-center w-full flex flex-col relative'>
              <OrngText className='text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold'>What is next?</OrngText>
            </div>
            <div className='mt-20 flex flex-col w-full max-w-15/16 md:max-w-full w-screen mx-auto pr-2 md:max-w-screen 2k:max-w-[1200px]'>
              <Disclosure>
                <Disclosure.Button className='flex items-center py-4 px-10 text-black bg-[#FE5540]'>
                  <h2 className='font-bold text-6xl uppercase'>UI/UX updates</h2>
                  <div className='flex-1' />
                  <span className='font-semibold text-xl'>In progress</span>
                  <ArrowRightIcon className='w-6 h-6 ml-4' />
                </Disclosure.Button>
                <Disclosure.Panel className='border-[#FE5540] border-x-4 py-4 px-4'>
                  some intel about UI/UX
                </Disclosure.Panel>
              </Disclosure>
              <Disclosure>
                <Disclosure.Button className='flex items-center py-4 px-10 text-black bg-[#FED503]'>
                  <h2 className='font-bold text-6xl uppercase'>Token Launch</h2>
                  <div className='flex-1' />
                  <span className='font-semibold text-xl'>Jun 21, 2022</span>
                  <ArrowRightIcon className='w-6 h-6 ml-4' />
                </Disclosure.Button>
                <Disclosure.Panel className='border-[#FED503] border-x-4 py-4 px-4'>
                  some intel about the token launch
                </Disclosure.Panel>
              </Disclosure>
              <Disclosure>
                <Disclosure.Button className='flex items-center py-4 px-10 text-black bg-[#AC4EFD]'>
                  <h2 className='font-bold text-6xl uppercase'>Multi-Edition NFTs</h2>
                  <div className='flex-1' />
                  <span className='font-semibold text-xl'>July/August</span>
                  <ArrowRightIcon className='w-6 h-6 ml-4' />
                </Disclosure.Button>
                <Disclosure.Panel className='border-[#AC4EFD] border-4 py-4 px-4'>
                  some intel about the multi-edition nfts
                </Disclosure.Panel>
              </Disclosure>
            </div>
            <div className='mt-10 flex justify-center w-full'>
              <Button variant='rainbow' className='rounded-lg' onClick={() => {
                alert('viewing full roadmap');
              }}>
                <span className='font-medium px-6 uppercase'>See full roadmap</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
