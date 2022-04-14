import WalletConnectProvider from '@walletconnect/web3-provider';
import { Button } from 'components/Button';
import { InputField } from 'components/InputField';
import SEO from 'components/SEO';
import { Form, Formik } from 'formik';
import { useLayoutContext } from 'hooks/useLayoutContext';
import { Checked } from 'icons/Checked';
import { OgunLogo } from 'icons/OgunLogo';
import { useCreateWhitelistEntryMutation } from 'lib/graphql';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import Web3 from 'web3';
import * as yup from 'yup';

interface ProductCharacteristicsProps {
  title: string;
  content: string;
  iconColor?: string;
}

interface FormValues {
  email: string;
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

const validationSchema: yup.SchemaOf<FormValues> = yup.object().shape({
  email: yup.string().email('Please enter a valid email address').required('Please enter your email address'),
});

export default function Index() {
  const { setIsLandingLayout } = useLayoutContext();
  const [account, setAccount] = useState<string>();
  const [createWhitelistEntry] = useCreateWhitelistEntryMutation();
  const [added, setAdded] = useState(false);
  const [closeModal, setCloseModal] = useState<boolean>(true);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const provider: any = new WalletConnectProvider({
    rpc: {
      1: 'https://cloudflare-eth.com/', // https://ethereumnodes.com/
      137: 'https://polygon-rpc.com/', // https://docs.polygon.technology/docs/develop/network-details/network/
      // ...
    },
  });

  const connectWC = async () => {
    try {
      await provider.enable();
      const web3 = new Web3(provider);
      const accounts = await web3.eth?.getAccounts();
      if (accounts) setAccount(accounts[0]); // get the primary account
    } catch (error) {
      setCloseModal(!closeModal);
      console.warn('warn: ', error);
    }
  };

  useEffect(() => {
    setIsLandingLayout(true);

    return () => {
      setIsLandingLayout(false);
    };
  }, [setIsLandingLayout]);

  const handleCreateWhitelistEntry = async (values: FormValues) => {
    try {
      if (account) {
        await createWhitelistEntry({
          variables: { input: { walletAddress: account, emailAddress: values.email } },
        });
        setAdded(true);
      }
    } catch (error) {
      console.warn('warn: ', error);
    }
  };

  return (
    <>
      <SEO title="SoundChain" description="SoundChain" canonicalUrl="/" />
      <main className="flex flex-col items-center justify-center gap-20 md:gap-30 py-36 md:py-52 font-rubik text-white w-full">
        <section className="flex flex-col items-center justify-center pb-20">
          <OgunLogo className="w-full" />
          <h2 className="text-center text-3xl md:text-5xl font-extrabold pt-14">
            Giving the power <span className="green-blue-gradient-text-break">back to the artists</span>
          </h2>
          <p className="text-xl text-center py-14">
            Our native ERC-20 token that lets our users take <br className="hidden md:block" /> part in shaping the
            platform&#39;s future.
          </p>
          {account ? (
            <span className="font-bold w-full flex flex-col max-w-md text-xl">
              {added ? (
                <span className="yellow-gradient-text-break text-center text-2xl md:text-3xl">ADDED</span>
              ) : (
                <>
                  <span className="text-center text-lg">
                    Connected to {account.substring(0, 5)}…{account.substring(account.length - 4)}
                  </span>
                  <span className="text-center text-lg">So we can let you know when the airdrop is live</span>
                  <Formik
                    initialValues={{ email: '' }}
                    validationSchema={validationSchema}
                    onSubmit={handleCreateWhitelistEntry}
                  >
                    <Form className="flex flex-1 flex-col justify-between">
                      <div className="flex flex-col gap-3 pt-4">
                        <InputField placeholder="Email address" type="email" name="email" />
                      </div>
                      <Button type="submit" className="w-full mt-6">
                        ENTER
                      </Button>
                    </Form>
                  </Formik>
                </>
              )}
            </span>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <Button variant="rainbow" onClick={connectWC}>
                <span className="font-medium px-6">CONNECT YOUR WALLET</span>
              </Button>
              <span className="text-sm md:text-base font-thin">Join the airdrop whitelist</span>
            </div>
          )}
        </section>

        <section className="w-full pb-14  md:pb-32">
          <span className="grid grid-cols-2">
            <span className="col-span-2 md:col-span-1 flex justify-start md:justify-end pb-14 md:pb-0 md:-mb-6 md:-mr-24">
              <h1 className="text-left  text-4xl md:text-6xl font-extrabold text-white">
                {`Earn OGUN `}
                <span className="green-blue-gradient-text-break">
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
              <p className="font-light col-span-2 md:col-span-1 text-2xl md:text-4xl text-left pt-14 max-w-md">
                Users can earn additional OGUN just by buying and selling NFT&#39;s on the SoundChain Marketplace
              </p>
            </span>
          </span>
        </section>

        <section className="w-full pb-14 md:pb-32">
          <span className="grid grid-cols-2">
            <span />
            <span className="col-span-2 md:col-span-1 flex justify-end md:justify-start pb-14 md:pb-0 md:-mb-24 md:ml-14">
              <h1 className="text-right text-4xl md:text-6xl font-extrabold">
                OGUN lets <br />
                your{' '}
                <span className="yellow-gradient-text-break">
                  voice be
                  <br /> heard
                </span>
              </h1>
            </span>
            <hr className="bg-rainbow-gradient h-px border-0 col-span-2 md:col-span-1" />
            <span />
            <span className="col-span-2 md:col-span-1 flex justify-end">
              <p className="font-light text-2xl md:text-4xl text-right pt-14 max-w-md">
                Any OGUN staked within the platform gives you a voice to shape the future of the platform
              </p>
            </span>
          </span>
        </section>

        <section className="w-full">
          <span className="grid grid-cols-2">
            <span className="col-span-2 md:col-span-1 flex justify-start md:justify-end pb-14 md:pb-0 md:-mb-10 md:-mr-20">
              <h1 className="text-left  text-4xl md:text-6xl font-extrabold">
                See your benefits
                <span className="purple-blue-gradient-text-break">
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
              <p className="font-light col-span-2 md:col-span-1 text-2xl md:text-4xl text-left pt-14 max-w-md">
                Special supporter badges, priotization on the Explore page, and the ability to tip artists - OGUN is
                built right into the SoundChain platform
              </p>
            </span>
          </span>
        </section>

        <section className="block lg:hidden w-full">
          <div className="relative h-[800px]">
            <Image layout="fill" objectFit="contain" quality={100} src="/mobile-roadmap.png" alt="roadmap" />
          </div>
        </section>

        <section className="hidden lg:block pt-24 w-full right-0">
          <div className="relative h-[600px]">
            <Image layout="fill" objectFit="contain" quality={100} src="/roadmap.png" alt="roadmap" />
          </div>
        </section>

        <section className="flex flex-col items-center justify-center">
          <div className="grid grid-cols-1 gap-8 md:pt-12 gap-x-32 md:grid-cols-2">
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
