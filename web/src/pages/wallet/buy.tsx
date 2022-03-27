import { BackButton } from 'components/Buttons/BackButton';
import SEO from 'components/SEO';
import { TopNavBarProps } from 'components/TopNavBar';
import { useLayoutContext } from 'hooks/useLayoutContext';
import { useMe } from 'hooks/useMe';
import { Matic } from 'icons/Matic';
import { MexcGlobal } from 'icons/MexcGlobal';
import { Moonpay } from 'icons/Moonpay';
import { Navigate } from 'icons/Navigate';
import { Binance } from 'icons/Binance';
import { CryptoDotCom } from 'icons/CryptoDotCom';
import { OkCoin } from 'icons/OkCoin';
import { Polygon } from 'icons/Polygon';
import { Ramp } from 'icons/Ramp';
import { cacheFor } from 'lib/apollo';
import { isMainNetwork } from 'lib/blockchainNetworks';
import { protectPage } from 'lib/protectPage';
import Image from 'next/image';
import React, { useEffect } from 'react';

export const getServerSideProps = protectPage(async (context, apolloClient) => {
  try {
    if (!context.user) return { notFound: true };
    return await cacheFor(BuyMaticPage, {}, context, apolloClient);
  } catch (error) {
    return { notFound: true };
  }
});

const topNovBarProps: TopNavBarProps = {
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

export default function BuyMaticPage() {
  const me = useMe();
  const { setTopNavBarProps } = useLayoutContext();

  useEffect(() => {
    setTopNavBarProps(topNovBarProps);
  }, [setTopNavBarProps]);

  if (!me) return null;

  return (
    <>
      <SEO
        title="Wallet Buy Funds | SoundChain"
        description="Buy funds on your SoundChain wallet"
        canonicalUrl="/wallet/buy/"
      />
      <div className="px-8 py-4 text-gray-80 text-xs">
        <p className="text-center m-4 font-bold">
          In order to mint or purchase {"NFT's"} on SoundChain, you must have:
        </p>
        <p className="flex items-center justify-center">
          {MaticSign} on the {PolygonSign} chain.
        </p>
        {isMainNetwork ? <MainnetLinks /> : <PolygonFaucetLink />}
        <p className="text-center my-10 font-bold">
          If you live in the United States, the following exchanges support buying Matic.
        </p>
        <div className="flex items-center justify-center space-x-4 my-10">
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
          className="flex flex-col gap-3 rounded-lg p-4 bg-black border-2 border-gray-40 my-4"
        >
          <div className="flex space-beetween text-gray-200 justify-between">
            <div className="flex items-center gap-2 text-white text-xs font-bold">
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
  );
}

interface MainnetLinkProps {
  text: string;
  url: string;
  icon: (props: React.ComponentProps<'svg'>) => JSX.Element;
}

const MainnetLink = ({ text, url, icon: Icon }: MainnetLinkProps) => (
  <a
    className="rounded-lg border-2 border-gray-50 bg-black h-24 flex flex-col flex-1 gap-2 justify-center items-center p-6 relative"
    href={url}
    target="_blank"
    rel="noreferrer"
  >
    <Navigate className="absolute top-3 right-3" />
    <Icon />
    <span>{text}</span>
  </a>
);

const MainnetLinks = () => (
  <div className="flex items-center justify-center gap-7 text-white my-4">
    <MainnetLink text="ramp.network" url="https://ramp.network/" icon={Ramp} />
    <MainnetLink text="moonpay.com" url="https://www.moonpay.com/" icon={Moonpay} />
  </div>
);

export const PolygonFaucetLink = () => (
  <a
    href="https://faucet.polygon.technology/"
    target="_blank"
    rel="noreferrer"
    aria-label={`Claim free 0.1 Matic on Polygon Faucet`}
  >
    <div className="flex flex-col space-y-2 items-center rounded-lg p-6 bg-black border-2 border-gray-40 text-center my-4">
      <div className="flex items-center text-gray-200">{PolygonSign} Faucet</div>
      <div className="flex items-center font-bold">
        Claim <span className="text-white mx-2">FREE</span> 0.1 {MaticSign}
      </div>
    </div>
  </a>
);
