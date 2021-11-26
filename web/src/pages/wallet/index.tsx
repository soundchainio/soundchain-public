import { BackButton } from 'components/Buttons/BackButton';
import { Jazzicon } from 'components/Jazzicon';
import { Layout } from 'components/Layout';
import { LoaderAnimation } from 'components/LoaderAnimation';
import { OwnedNfts } from 'components/OwnedNfts';
import ReceiveMatic from 'components/ReceiveMatic';
import { TopNavBarProps } from 'components/TopNavBar';
import { useMagicContext } from 'hooks/useMagicContext';
import { useMe } from 'hooks/useMe';
import useMetaMask from 'hooks/useMetaMask';
import { Activity } from 'icons/Activity';
import { ArrowDown } from 'icons/ArrowDown';
import { ArrowUpRight } from 'icons/ArrowUpRight';
import { Copy2 as Copy } from 'icons/Copy2';
import { CreditCard } from 'icons/CreditCard';
import { Logo } from 'icons/Logo';
import { Matic } from 'icons/Matic';
import { MetaMask } from 'icons/MetaMask';
import { Polygon } from 'icons/Polygon';
import { testNetwork } from 'lib/blockchainNetworks';
import { DefaultWallet, useMaticUsdQuery, useUpdateDefaultWalletMutation } from 'lib/graphql';
import Head from 'next/head';
import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { currency } from 'utils/format';

const topNavBarProps: TopNavBarProps = {
  leftButton: <BackButton />,
  title: 'Wallet',
};

interface WalletButtonProps {
  href?: string;
  title: string;
  icon: (props: React.SVGProps<SVGSVGElement>) => JSX.Element;
  handleOnClick?: () => void;
}
const WalletButton = ({ href, title, icon: Icon, handleOnClick }: WalletButtonProps) => {
  const className = 'text-gray-80 text-xs font-bold flex flex-col items-center gap-2';

  const Content = () => {
    return (
      <>
        <div className="rounded-full border-gray-50 border-2 w-10 h-10 flex justify-center items-center">
          <Icon />
        </div>
        {title}
      </>
    );
  };

  if (href) {
    return (
      <Link href={href}>
        <a className={className}>
          <Content />
        </a>
      </Link>
    );
  }

  return (
    <button className={className} onClick={handleOnClick}>
      <Content />
    </button>
  );
};

export default function WalletPage() {
  const me = useMe();
  const { data } = useMaticUsdQuery();
  const { account, balance, connect, chainId, addMumbaiTestnet } = useMetaMask();
  const { account: magicAccount, balance: magicBalance } = useMagicContext();
  const [updateDefaultWallet] = useUpdateDefaultWalletMutation();

  const [selectedWallet, setSelectedWallet] = useState(DefaultWallet.Soundchain);
  const [connectedToMetaMask, setConnectedToMetaMask] = useState(false);
  const [correctNetwork, setCorrectNetwork] = useState(true);
  const [showReceivePage, setShowReceivePage] = useState(false);

  const getAccount = selectedWallet === DefaultWallet.Soundchain ? magicAccount : account;
  const getBalance = selectedWallet === DefaultWallet.Soundchain ? magicBalance : balance;

  useEffect(() => {
    if (!account) {
      setConnectedToMetaMask(false);
      return;
    }
    setConnectedToMetaMask(true);
  }, [account]);

  useEffect(() => {
    if (chainId !== testNetwork.id) {
      setCorrectNetwork(false);
    } else {
      setCorrectNetwork(true);
    }
  }, [chainId]);

  const WalletHeader = () => {
    return (
      <div className="flex items-center gap-2 bg-gray-15 font-bold text-xs py-4 px-3">
        <div className="relative">
          <select
            className="bg-gray-25 text-gray-80 font-bold text-xs rounded-lg border-0 pl-8"
            name="Wallet"
            id="wallet"
            onChange={e =>
              setSelectedWallet(
                DefaultWallet.Soundchain === e.target.value ? DefaultWallet.Soundchain : DefaultWallet.MetaMask,
              )
            }
            value={selectedWallet}
          >
            <option value={DefaultWallet.Soundchain}>SoundChain</option>
            <option value={DefaultWallet.MetaMask}>MetaMask</option>
          </select>
          <span className="absolute top-2 left-2 pointer-events-none">
            {selectedWallet === DefaultWallet.Soundchain ? (
              <Logo id="soundchain-wallet" height="16" width="16" />
            ) : (
              <MetaMask height="16" width="16" />
            )}
          </span>
        </div>
        {(selectedWallet === DefaultWallet.Soundchain ||
          (selectedWallet === DefaultWallet.MetaMask && connectedToMetaMask && correctNetwork)) && (
          <label className="ml-auto flex items-center gap-2">
            <span className="text-sm leading-3 font-bold text-white">Default wallet</span>
            <input
              type="checkbox"
              className="h-5 w-5 text-black bg-black border-gray-30 rounded border-2"
              onChange={() => updateDefaultWallet({ variables: { input: { defaultWallet: selectedWallet } } })}
              checked={me?.defaultWallet === selectedWallet}
            />
          </label>
        )}
      </div>
    );
  };

  interface MetaMaskButtonProps {
    caption: string;
    handleOnClick: () => void;
  }

  const MetaMaskButton = ({ caption, handleOnClick }: MetaMaskButtonProps) => {
    return (
      <button
        className="flex gap-2 justify-center items-center border-2 rounded-lg border-gray-50 bg-gray-30 text-white font-black text-xs uppercase px-4 h-16"
        onClick={handleOnClick}
      >
        <MetaMask height="30" width="30" />
        {caption}
      </button>
    );
  };

  if (showReceivePage && getAccount) {
    return <ReceiveMatic address={getAccount} backButton={() => setShowReceivePage(false)} />;
  }

  return (
    <Layout topNavBarProps={topNavBarProps}>
      <Head>
        <title>Soundchain - Wallet</title>
        <meta name="description" content="Wallet" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="h-full flex flex-col">
        <WalletHeader />
        {selectedWallet === DefaultWallet.MetaMask && (!connectedToMetaMask || !correctNetwork) ? (
          !connectedToMetaMask ? (
            <div className="flex justify-center items-center h-full">
              <MetaMaskButton caption="Connect Metamask" handleOnClick={connect} />
            </div>
          ) : (
            !correctNetwork && (
              <div className="flex flex-col gap-4 justify-center items-center h-full px-4">
                <p className="text-white text-center">It seems you might not be connected to Mumbai Testnet.</p>
                <MetaMaskButton caption="Connect to Mumbai Testnet" handleOnClick={addMumbaiTestnet} />
              </div>
            )
          )
        ) : (
          <>
            <div className="flex flex-col gap-4 justify-center items-center p-4">
              {getAccount && <Jazzicon address={getAccount} size={54} />}
              <div className="flex gap-2 items-center font-bold text-xs">
                <span className="ml-auto uppercase relative text-gray-80 before:bg-green-400 before:rounded-full before:h-1 before:w-1 before:inline-block before:absolute before:mt-[0.375rem] before:-ml-2">
                  Network:
                </span>
                <Polygon />
                <span className="text-white mr-2">Polygon</span>
              </div>
              <div className="flex flex-row text-xxs bg-gray-1A w-full pl-2 pr-3 py-2 items-center justify-between border border-gray-50 rounded-sm">
                <div className="flex flex-row items-center w-10/12 justify-start">
                  <Polygon />
                  <span className="text-gray-80 md-text-sm font-bold mx-1 truncate w-full">{getAccount}</span>
                </div>
                <button
                  className="flex flex-row gap-1 items-center border-2 border-gray-30 border-opacity-75 rounded p-1"
                  onClick={() => {
                    navigator.clipboard.writeText(getAccount + '');
                    toast('Copied to clipboard');
                  }}
                  type="button"
                >
                  <Copy />
                  <span className="text-gray-80 uppercase leading-none">copy</span>
                </button>
              </div>
              <div className="flex flex-col items-center gap-1">
                <Matic height="30" width="30" />
                {getBalance ? (
                  <>
                    <p className="text-blue-400 font-bold text-xs uppercase mt-2">
                      <span className="text-white font-bold text-2xl">{getBalance}</span>
                      {` matic`}
                    </p>
                    {data?.maticUsd && (
                      <span className="text-xs text-gray-50 font-bold">
                        {`${currency(parseFloat(getBalance) * parseFloat(data?.maticUsd))} USD`}
                      </span>
                    )}
                  </>
                ) : (
                  <LoaderAnimation />
                )}
              </div>
              <div className="flex gap-5 mt-4">
                <WalletButton title="Activity" icon={Activity} href={`/wallet/${getAccount}/history`} />
                <WalletButton title="Receive" icon={ArrowDown} handleOnClick={() => setShowReceivePage(true)} />
                <WalletButton title="Buy" icon={CreditCard} href="/wallet/buy" />
                <WalletButton title="Send" icon={ArrowUpRight} href="/wallet/transfer" />
              </div>
            </div>
            <div className="p-3 mt-3">
              <span className="text-gray-80 font-bold">Owned NFT’s</span>
            </div>
            {getAccount && <OwnedNfts owner={getAccount} />}
          </>
        )}
      </div>
    </Layout>
  );
}
