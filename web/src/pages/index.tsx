import { Button } from 'components/Button';
import SEO from 'components/SEO';
import { useLayoutContext } from 'hooks/useLayoutContext';
import { Checked } from 'icons/Checked';
import { OgunLogo } from 'icons/OgunLogo';
import { useEffect, useState } from 'react';

interface ProductCharacteristicsProps {
  title: string;
  content: string;
  iconColor?: string;
}

const ProductCharacteristics = ({ title, content }: ProductCharacteristicsProps) => {
  return (
    <div className="flex items-baseline gap-2 max-w-md	">
      <span className="w-6">
        <Checked color="green-blue" className="h-5 w-5 " />
      </span>
      <span>
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="text-gray-400 pt-2">{content}</p>
      </span>
    </div>
  );
};


export default function Index() {
  const { setIsLandingLayout } = useLayoutContext();
  const [account, setAccount] = useState<string>();

  useEffect(() => {
    setIsLandingLayout(true);

    return () => {
      setIsLandingLayout(false);
    };
  }, [setIsLandingLayout]);

  return (
    <>
      <SEO title="SoundChain" description="SoundChain" canonicalUrl="/" />
      <main className="flex flex-col items-center justify-center gap-40 py-36 md:py-52 font-rubik text-white w-full">
        <section className="flex flex-col items-center justify-center pb-20">
            <OgunLogo className='h-28 w-80 md:h-[213px] md:w-[845px] '/>
          <h2 className="text-center text-4xl md:text-5x1 font-extrabold pt-14">
            Giving the power <span className="green-blue-gradient-text">back to the artists</span>
          </h2>
          <p className="text-2xl text-center py-14">
            Our native ER-20 token that lets our users take <br className="hidden md:block" /> part in shaping the
            platform&#39;s future.
          </p>
          {account ? (
            <span className="font-bold">
              Connected with {account.substring(0, 5)}...{account.substring(account.length - 4)}
            </span>
          ) : (
            <Button variant="rainbow">
              CONNECT YOUR WALLET
            </Button>
          )}
        </section>

        <section className="w-full">
          <span className="grid grid-cols-2">
            <span className="col-span-2 md:col-span-1 flex md:justify-end pb-14 md:pb-0 md:-mb-4 md:-mr-24">
              <h1 className="text-left  text-4xl md:text-5xl font-extrabold text-white">
                {`Earn OGUN `}
                <span className="green-blue-gradient-text">
                  just <br />
                  by using the <br />
                  platform
                </span>
              </h1>
            </span>
            <span />
            <span />
            <span className="col-span-2 md:col-span-1">
              <hr className="bg-rainbow-gradient h-px border-0" />
              <p className="font-light col-span-2 md:col-span-1 text-4xl text-left pt-14 max-w-md">
                Users can earn additional OGUN just by buying and selling NFT&#39;s on the SoundChain Marketplace
              </p>
            </span>
          </span>
        </section>

        <section className="w-full">
          <span className="grid grid-cols-2">
            <span />
            <span className="col-span-2 md:col-span-1 flex md:justify-start pb-14 md:pb-0 md:-mb-16 md:ml-14">
              <h1 className="text-right text-4xl md:text-5xl font-extrabold">
                OGUN lets <br />
                your{' '}
                <span className="yellow-gradient-text">
                  voice be
                  <br /> heard
                </span>
              </h1>
            </span>
            <hr className="bg-rainbow-gradient h-px border-0 col-span-2 md:col-span-1" />
            <span />
            <span className="col-span-2 md:col-span-1 flex justify-end">
              <p className="font-light text-4xl text-right pt-14 max-w-md">
                Any OGUN staked within the platform gives you a voice to shape the future of the platform
              </p>
            </span>
          </span>
        </section>

        <section className="w-full">
          <span className="grid grid-cols-2">
            <span className="col-span-2 md:col-span-1 flex justify-end pb-14 md:pb-0 md:-mb-10 md:-mr-20">
              <h1 className="text-left  text-4xl md:text-5xl font-extrabold">
                See your benefits
                <span className="purple-blue-gradient-text">
                  <br />
                  Right on <br />
                  SoundChain
                </span>
              </h1>
            </span>
            <span />
            <span />
            <span className="col-span-2 md:col-span-1">
              <hr className="bg-rainbow-gradient h-px border-0" />
              <p className="font-light col-span-2 md:col-span-1 text-4xl text-left pt-14 max-w-md">
                Special supporter badges, priotization on the Explore page, and the ability to tip artists - OGUN is
                built right into the SoundChain platform
              </p>
            </span>
          </span>
        </section>

        <section className="flex justify-end -mr-10 w-full">
        </section>

        <section className="flex flex-col items-center justify-center">
          <div className="grid grid-cols-1 gap-8 pt-4 md:pt-12 gap-x-32 md:grid-cols-2">
            <ProductCharacteristics
              title="Ways to earn"
              content="Staking, liquidity pools, trading rewards, and airdrops all designed to spread the love."
            />
            <ProductCharacteristics
              title="Set supply"
              content="No dilution built into the system. One billion tokens. That&#39;s it"
            />
            <ProductCharacteristics
              title="SoundChain bonuses"
              content="With features coming right and launch and features on the roadmap, OGUN will be closely tied in with the SoundChain platform."
            />
            <ProductCharacteristics title="Governance" content="Your token, your voice." />
          </div>
        </section>
      </main>
    </>
  );
}
