import Image from 'next/image';
import { twd } from '../../utils/twd';

const orngBash = twd(`text-transparent bg-clip-text bg-gradient-to-b 
from-[#FED503] to-[#FE5540]`);

const OrngText = orngBash.span;
const OrngCol = orngBash(
  `flex flex-row gap-4 sm:gap-0 sm:flex-col items-center justify-center sm:items-start sm:justify-start bg-none bg-[#FED503]`,
).div;

const SectionWrapper = twd(
  `max-w-7xl lg:max-w-full mx-auto sm:px-6 mt-56 sm:mt-0 max-h-screen flex flex-col lg:px-0`,
).div;

export function CollectMusicNFTSection() {
  return (
    <div className="relative md:pt-10 lg:pt-0">
      <SectionWrapper className="">
        <div className="container mx-auto h-full flex-1 xl:px-40">
          <div className="relative flex h-full flex-col items-start py-16 md:py-24 md:pl-4 md:pl-6 lg:py-32 lg:pl-8">
            <div className="relative flex w-full w-full flex-col text-center">
              <OrngText className="text-4xl font-bold md:text-5xl lg:text-6xl xl:text-7xl">collect</OrngText>
              <span className="text-3xl">exclusive music NFTs</span>
            </div>
            <div className="mt-20 flex w-full flex-col-reverse items-center md:flex-row">
              <div className="mt-10 flex min-w-[400px] flex-col items-center">
                <span className="w-full text-center text-2xl font-semibold text-white md:text-left md:text-3xl">
                  Full ownership over how
                </span>
                <OrngCol className="w-full text-7xl uppercase">
                  <span>your</span>
                  <span>art</span>
                </OrngCol>
                <span className="w-full text-center text-3xl font-semibold text-white md:text-left">is used</span>
              </div>
              <div className="-ml-10 max-w-[300px] md:ml-0 md:max-w-[584px]">
                <Image
                  alt=""
                  width={584}
                  height={544}
                  className="h-full w-full object-contain"
                  src="/landing-page/laptop.png"
                />
              </div>
            </div>
          </div>
        </div>
      </SectionWrapper>
    </div>
  );
}
