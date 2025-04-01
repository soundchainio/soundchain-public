import Image from 'next/image';
import { twd } from '../../utils/twd';

const greenishBase = twd(`text-transparent bg-clip-text bg-gradient-to-b
from-[#26D1A8] via-[#77F744] to-[#FED503]`);

const GreenishText = greenishBase.span;
const GreenishBorder = greenishBase(`absolute -left-4 h-full w-1 bg-clip-border`).div;

const SectionWrapper = twd(
  `max-w-7xl lg:max-w-full mx-auto sm:px-6 lg:px-0 max-h-[670px] md:max-h-[850px] flex flex-col sm:pt-20`,
).div;

export function MintSongsSection() {
  return (
    <>
      <div className="relative">
        <div className="pointer-events-none absolute top-40 z-10 h-[500px] w-full sm:top-32">
          <div style={{ position: 'relative', width: '100%', height: 'auto' }}>
            <Image
              alt=""
              className="z-30 max-h-[300px] w-full object-cover"
              src="/landing-page/wave-bg.svg"
              width={1511}
              height={387}
              style={{ width: '100%', height: 'auto' }}
            />
          </div>
        </div>
      </div>

      <div className="relative z-10">
        <SectionWrapper>
          <div className="container mx-auto h-full flex-1 xl:px-40">
            <div className="relative flex h-full flex-col items-center py-16 pl-4 md:items-start md:pl-6 lg:pl-8">
              <div className="relative flex w-full flex-col text-center">
                <GreenishText className="text-4xl font-bold md:text-5xl lg:text-6xl xl:text-7xl">quickly</GreenishText>
                <span className="text-3xl">mint songs on the blockchain</span>
              </div>
              <div className="mt-56 flex flex-col lg:flex-row">
                <div className="flex min-w-[400px] flex-col">
                  <span className="text-center text-3xl font-semibold text-white md:text-left">Mint NFTs on</span>
                  <div className="mx-auto flex flex-row py-3 text-7xl text-[#77F744] md:mx-0">
                    <span>polygon</span>
                  </div>
                  <span className="text-center text-3xl font-semibold text-white md:text-left">blockchain</span>
                </div>

                <div className="py-2 text-center text-white md:hidden">
                  <div className="text-wrap min-w-0 max-w-full px-2">
                    Our native ERC-20 token that lets our users take part in
                  </div>
                  <div className="text-wrap min-w-0 max-w-full py-2">shaping the {`platform's`} future.</div>
                </div>

                <div className="flex flex-col">
                  <div className="hidden px-2 text-center text-white md:inline-block">
                    <div className="px-2">Our native ERC-20 token that lets our users take part in</div>
                    <div>shaping the {`platform's`} future.</div>
                  </div>

                  <div className="min-h-[830px] sm:min-h-[670px] md:min-h-[630px]">
                    <div className="mt-10 flex flex-col gap-4 px-6 sm:px-0 lg:grid lg:grid-cols-3">
                      <div className="relative col-span-1 flex flex-col">
                        <GreenishBorder />
                        <span className="text-2xl uppercase text-white">
                          Simple <span className="hidden sm:block" />
                          to use
                        </span>
                        <span className="mt-2 max-w-8/10 text-slate-300">
                          You {`shouldn't`} need to lawyer up over the banger you just made
                        </span>
                      </div>
                      <div className="relative col-span-1 flex flex-col">
                        <GreenishBorder />
                        <span className="text-2xl uppercase text-white">
                          full <span className="hidden sm:block" />
                          ownership
                        </span>
                        <span className="mt-2 max-w-8/10 text-slate-300">
                          Get full control over how your work is used and where
                        </span>
                      </div>
                      <div className="relative col-span-1 flex flex-col">
                        <GreenishBorder />
                        <span className="text-2xl uppercase text-white">
                          your music <span className="hidden sm:block" />
                          earns more
                        </span>
                        <span className="mt-2 max-w-8/10 text-slate-300">
                          Blockchain hosting means you get paid directly per stream
                        </span>
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
