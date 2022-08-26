import SEO from 'components/SEO'
import { TopNavBarProps } from 'components/TopNavBar'
import { useLayoutContext } from 'hooks/useLayoutContext'
import { useMe } from 'hooks/useMe'
import { Matic } from 'icons/Matic'
import { MexcGlobal } from 'icons/MexcGlobal'
import { Moonpay } from 'icons/Moonpay'
import { Navigate } from 'icons/Navigate'
import { Binance } from 'icons/Binance'
import { CryptoDotCom } from 'icons/CryptoDotCom'
import { OkCoin } from 'icons/OkCoin'
import { Polygon } from 'icons/Polygon'
import { Ramp } from 'icons/Ramp'
import { cacheFor } from 'lib/apollo'
import { isMainNetwork } from 'lib/blockchainNetworks'
import { protectPage } from 'lib/protectPage'
import Image from 'next/image'
import React, { useEffect } from 'react'

export const getServerSideProps = protectPage(async (context, apolloClient) => {
  try {
    if (!context.user) return { notFound: true }
    return await cacheFor(BuyMaticPage, {}, context, apolloClient)
  } catch (error) {
    return { notFound: true }
  }
})

const topNovBarProps: TopNavBarProps = {
  title: 'Buy Matic',
}

const MaticSign = (
  <span className="mx-2 flex items-center font-semibold text-blue-400">
    <Matic className="mr-2" /> MATIC
  </span>
)

const PolygonSign = (
  <span className="mx-2 flex items-center font-semibold text-purple-500">
    <Polygon className="mr-2" /> Polygon
  </span>
)

export default function BuyMaticPage() {
  const me = useMe()
  const { setTopNavBarProps } = useLayoutContext()

  useEffect(() => {
    setTopNavBarProps(topNovBarProps)
  }, [setTopNavBarProps])

  if (!me) return null

  return (
    <>
      <SEO
        title="Wallet Buy Funds | SoundChain"
        description="Buy funds on your SoundChain wallet"
        canonicalUrl="/wallet/buy/"
      />
      <div className="px-8 py-4 text-xs text-gray-80">
        <p className="m-4 text-center font-bold">
          In order to mint or purchase {"NFT's"} on SoundChain, you must have:
        </p>
        <p className="flex items-center justify-center">
          {MaticSign} on the {PolygonSign} chain.
        </p>
        {isMainNetwork ? <MainnetLinks /> : <PolygonFaucetLink />}
        <p className="my-10 text-center font-bold">
          If you live in the United States, the following exchanges support buying Matic.
        </p>
        <div className="my-10 flex items-center justify-center space-x-4">
          <a href="https://www.binance.us/" rel="noreferrer" target="_blank">
            <Binance />
          </a>
          <a href="https://crypto.com/us/app" rel="noreferrer" target="_blank">
            <CryptoDotCom />
          </a>
          <a href="https://www.okcoin.com/" rel="noreferrer" target="_blank">
            <OkCoin />
          </a>
          <a href="https://www.mexc.com/" rel="noreferrer" target="_blank">
            <MexcGlobal />
          </a>
        </div>
        <a
          href="https://wallet.polygon.technology/"
          rel="noreferrer"
          target="_blank"
          className="my-4 flex flex-col gap-3 rounded-lg border-2 border-gray-40 bg-black p-4"
        >
          <div className="space-beetween flex justify-between text-gray-200">
            <div className="flex items-center gap-2 text-xs font-bold text-white">
              <Image height="28" width="26" src="/polygon-bridge.png" alt="" priority />
              <span>Polygon Bridge</span>
            </div>
            <span className="flex items-center">
              wallet.polygon <Navigate className="ml-2" />
            </span>
          </div>
          <p>Deposit and withdraw between the Ethereum and Polygon networks.</p>
        </a>
      </div>
    </>
  )
}

interface MainnetLinkProps {
  text: string
  url: string
  icon: (props: React.ComponentProps<'svg'>) => JSX.Element
}

const MainnetLink = ({ text, url, icon: Icon }: MainnetLinkProps) => (
  <a
    className="relative flex h-24 flex-1 flex-col items-center justify-center gap-2 rounded-lg border-2 border-gray-50 bg-black p-6"
    href={url}
    target="_blank"
    rel="noreferrer"
  >
    <Navigate className="absolute top-3 right-3" />
    <Icon />
    <span>{text}</span>
  </a>
)

const MainnetLinks = () => (
  <div className="my-4 flex items-center justify-center gap-7 text-white">
    <MainnetLink text="ramp.network" url="https://ramp.network/" icon={Ramp} />
    <MainnetLink text="moonpay.com" url="https://www.moonpay.com/" icon={Moonpay} />
  </div>
)

export const PolygonFaucetLink = () => (
  <a
    href="https://faucet.polygon.technology/"
    target="_blank"
    rel="noreferrer"
    aria-label={`Claim free 0.1 Matic on Polygon Faucet`}
  >
    <div className="my-4 flex flex-col items-center space-y-2 rounded-lg border-2 border-gray-40 bg-black p-6 text-center">
      <div className="flex items-center text-gray-200">{PolygonSign} Faucet</div>
      <div className="flex items-center font-bold">
        Claim <span className="mx-2 text-white">FREE</span> 0.1 {MaticSign}
      </div>
    </div>
  </a>
)
