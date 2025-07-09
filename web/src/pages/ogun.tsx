import { useEffect, useState } from 'react'

import { Button } from 'components/common/Buttons/Button'
import { InputField } from 'components/InputField'
import SEO from 'components/SEO'
import { Form, Formik } from 'formik'
import { useLayoutContext } from 'hooks/useLayoutContext'
import { Checked } from 'icons/Checked'
import { OgunLogo } from 'icons/OgunLogo'
import { useCreateWhitelistEntryMutation } from 'lib/graphql'
import Image from 'next/image'
import Web3 from 'web3'
import * as yup from 'yup'

import WalletConnectProvider from '@walletconnect/web3-provider'

interface ProductCharacteristicsProps {
  title: string
  content: string
  iconColor?: string
}

interface FormValues {
  email: string
}

const ProductCharacteristics = ({ title, content }: ProductCharacteristicsProps) => {
  return (
    <div className="flex max-w-md items-baseline gap-2	">
      <span className="w-6">
        <Checked color="green-blue" className="h-5 w-5 " />
      </span>
      <span>
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="pt-2 text-gray-400">{content}</p>
      </span>
    </div>
  )
}

const validationSchema: yup.SchemaOf<FormValues> = yup.object().shape({
  email: yup.string().email('Please enter a valid email address').required('Please enter your email address'),
})

export default function OgunPage() {
  const { setIsLandingLayout } = useLayoutContext()
  const [account, setAccount] = useState<string>()
  const [createWhitelistEntry] = useCreateWhitelistEntryMutation()
  const [added, setAdded] = useState(false)
  const [closeModal, setCloseModal] = useState<boolean>(true)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const provider: any = new WalletConnectProvider({
    rpc: {
      1: 'https://cloudflare-eth.com/', // https://ethereumnodes.com/
      137: 'https://polygon-rpc.com/', // https://docs.polygon.technology/docs/develop/network-details/network/
      // ...
    },
  })

  const connectWC = async () => {
    try {
      await provider.enable()
      const web3 = new Web3(provider)
      const accounts = await web3.eth?.getAccounts()
      if (accounts) setAccount(accounts[0]) // get the primary account
    } catch (error) {
      setCloseModal(!closeModal)
      console.warn('warn: ', error)
    }
  }

  useEffect(() => {
    setIsLandingLayout(true)

    return () => {
      setIsLandingLayout(false)
    }
  }, [setIsLandingLayout])

  const handleCreateWhitelistEntry = async (values: FormValues) => {
    try {
      if (account) {
        await createWhitelistEntry({
          variables: { input: { walletAddress: account, emailAddress: values.email } },
        })
        setAdded(true)
      }
    } catch (error) {
      console.warn('warn: ', error)
    }
  }

  return (
    <>
      <SEO title="SoundChain" description="SoundChain" canonicalUrl="/ogun" />
      <main className="md:gap-30 flex w-full flex-col items-center justify-center gap-20 py-36 font-rubik text-white md:py-52">
        <section className="flex flex-col items-center justify-center pb-20">
          <OgunLogo className="w-full" />
          <h2 className="pt-14 text-center text-3xl font-extrabold md:text-5xl">
            Giving the power <span className="green-blue-gradient-text-break">back to the artists</span>
          </h2>
          <p className="py-14 text-center text-xl">
            Our native ERC-20 token that lets our users take <br className="hidden md:block" />
            part in shaping the platform's future. <br className="hidden md:block" />
            We’re working on some exciting features to launch alongside the token.
            <br className="hidden md:block" />
            We launched the Ogun token in August of 2022 and we expect to launch more features soon.
            <br className="hidden md:block" />
            Look out for updates on progress and launch dates these coming weeks.
            <br className="hidden md:block" />
            Thank you to the entire SoundChain family for your continued support and patience.
          </p>
          {account ? (
            <span className="flex w-full max-w-md flex-col text-xl font-bold">
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
                    {({ values, handleChange, ...formikProps }) => (
                      <Form
                        className="flex flex-1 flex-col justify-between"
                        {...(formikProps as any)} // Spread Formik props to satisfy additional HTML attributes
                      >
                        <div className="flex flex-col gap-3 pt-4">
                          <InputField placeholder="Email address" type="email" name="email" />
                        </div>
                        <Button type="submit" className="mt-6 w-full">
                          ENTER
                        </Button>
                      </Form>
                    )}
                  </Formik>
                </>
              )}
            </span>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <Button variant="rainbow" onClick={connectWC}>
                <span className="px-6 font-medium">CONNECT YOUR WALLET</span>
              </Button>
            </div>
          )}
        </section>

        <section className="w-full pb-14  md:pb-32">
          <span className="grid grid-cols-2">
            <span className="col-span-2 flex justify-start pb-14 md:col-span-1 md:-mb-6 md:-mr-24 md:justify-end md:pb-0">
              <h1 className="text-left  text-4xl font-extrabold text-white md:text-6xl">
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
              <hr className="h-px border-0 bg-rainbow-gradient" />
              <p className="col-span-2 max-w-md pt-14 text-left text-2xl font-light md:col-span-1 md:text-4xl">
                Users can earn additional OGUN just by buying and selling NFT's on the SoundChain Marketplace
              </p>
            </span>
          </span>
        </section>

        <section className="w-full pb-14 md:pb-32">
          <span className="grid grid-cols-2">
            <span />
            <span className="col-span-2 flex justify-end pb-14 md:col-span-1 md:-mb-24 md:ml-14 md:justify-start md:pb-0">
              <h1 className="text-right text-4xl font-extrabold md:text-6xl">
                OGUN lets <br />
                your{' '}
                <span className="yellow-gradient-text-break">
                  voice be
                  <br /> heard
                </span>
              </h1>
            </span>
            <hr className="col-span-2 h-px border-0 bg-rainbow-gradient md:col-span-1" />
            <span />
            <span className="col-span-2 flex justify-end md:col-span-1">
              <p className="max-w-md pt-14 text-right text-2xl font-light md:text-4xl">
                Any OGUN staked within the platform gives you a voice to shape the future of the platform
              </p>
            </span>
          </span>
        </section>

        <section className="w-full">
          <span className="grid grid-cols-2">
            <span className="col-span-2 flex justify-start pb-14 md:col-span-1 md:-mb-10 md:-mr-20 md:justify-end md:pb-0">
              <h1 className="text-left  text-4xl font-extrabold md:text-6xl">
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
              <hr className="h-px border-0 bg-rainbow-gradient" />
              <p className="col-span-2 max-w-md pt-14 text-left text-2xl font-light md:col-span-1 md:text-4xl">
                Special supporter badges, prioritization on the Explore page, and the ability to tip artists - OGUN is
                built right into the SoundChain platform
              </p>
            </span>
          </span>
        </section>

        <section className="block w-full lg:hidden">
          <div className="relative h-[800px]">
            <Image fill objectFit="contain" quality={100} src="/mobile-roadmap.png" alt="roadmap" />
          </div>
        </section>

        <section className="right-0 hidden w-full pt-24 lg:block">
          <div className="relative h-[600px]">
            <Image fill objectFit="contain" quality={100} src="/roadmap.png" alt="roadmap" />
          </div>
        </section>

        <section className="flex flex-col items-center justify-center">
          <div className="grid grid-cols-1 gap-8 gap-x-32 md:grid-cols-2 md:pt-12">
            <ProductCharacteristics
              title="Ways to earn"
              content="Staking, liquidity pools, trading rewards, and airdrops all designed to spread the love."
            />
            <ProductCharacteristics
              title="Set supply"
              content="No dilution built into the system. One billion tokens. That's it"
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
  )
}
