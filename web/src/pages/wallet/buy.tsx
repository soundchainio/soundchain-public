import { BackButton } from 'components/Buttons/BackButton';
import { Layout } from 'components/Layout';
import { TopNavBarProps } from 'components/TopNavBar';
import { useMe } from 'hooks/useMe';
import { MacNCheese } from 'icons/MacNCheese';
import { Matic } from 'icons/Matic';
import { MexcGlobal } from 'icons/MexcGlobal';
import { Moonpay } from 'icons/Moonpay';
import { Navigate } from 'icons/Navigate';
import { OkCoin } from 'icons/OkCoin';
import { Polygon } from 'icons/Polygon';
import { PolygonBridge } from 'icons/PolygonBridge';
import Head from 'next/head';
import React from 'react';

const topNovaBarProps: TopNavBarProps = {
  leftButton: <BackButton />,
  title: 'Buy Matic',
};

const MaticSign = (
  <span className="flex items-center text-blue-400 mx-2 font-semibold">
    <Matic className="mr-2" /> MATIC
  </span>
);

const PolygonSign = (
  <span className="flex items-center text-purple-500 mx-2 font-semibold">
    <Polygon className="mr-2" /> Polygon
  </span>
);

const MacNCheeseSign = (
  <span className="flex items-center text-white mx-2 font-semibold">
    <MacNCheese className="mr-2" /> {'Mac&Cheese'}
  </span>
);

export default function BuyMaticPage() {
  const me = useMe();
  if (!me) return null;

  return (
    <Layout topNavBarProps={topNovaBarProps}>
      <Head>
        <title>Soundchain - Wallet</title>
        <meta name="description" content="Wallet" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="px-8 py-4 text-gray-80 text-xs">
        <p className="text-center m-4">In order to mint or purchase {"NFT's"} on SoundChain, you must have:</p>
        <p className="flex items-center justify-center">
          {MaticSign} on the {PolygonSign} chain.
        </p>
        <a
          href="https://macncheese.finance/matic-polygon-mainnet-faucet.php"
          target="_blank"
          rel="noreferrer"
          aria-label={`Claim free 0.001 Matic on Mac&Cheese Finance`}
        >
          <div className="flex flex-col space-y-2 items-center rounded-lg p-6 bg-black border-2 border-gray-40 text-center my-4">
            <div className="flex items-center text-gray-200">{MacNCheeseSign} Finance</div>
            <div className="flex items-center font-bold">
              Claim <span className="text-white mx-2">FREE</span> .001 {MaticSign}
            </div>
          </div>
        </a>
        <p className="text-center m-4">
          If you live in the United States, the following exchanges support buying Matic.
        </p>
        <div className="flex items-center space-x-4 my-8">
          <a href="https://www.okcoin.com/" rel="noreferrer" target="_blank">
            <OkCoin />
          </a>
          <a href="https://www.mexc.com/" rel="noreferrer" target="_blank">
            <MexcGlobal />
          </a>
        </div>
        <div className="flex flex-col space-y-2 rounded-lg p-4 bg-black border-2 border-gray-40 my-4">
          <div className="flex space-beetween text-gray-200 justify-between">
            <Moonpay />
            <a href="https://www.moonpay.com/" rel="noreferrer" target="_blank" className="flex items-center">
              moonpay.com <Navigate className="ml-2" />
            </a>
          </div>
          <div>MoonPay allows users to purchase Matic on the Polygon chain via credit card.</div>
        </div>
        <div className="flex flex-col space-y-2 rounded-lg p-4 bg-black border-2 border-gray-40 my-4">
          <div className="flex space-beetween text-gray-200 justify-between">
            <PolygonBridge />
            <a href="https://wallet.polygon.technology/" rel="noreferrer" target="_blank" className="flex items-center">
              wallet.polygon <Navigate className="ml-2" />
            </a>
          </div>
          <div>Deposit and withdraw between the Ethereum and Polygon networks.</div>
        </div>
      </div>
    </Layout>
  );
}
