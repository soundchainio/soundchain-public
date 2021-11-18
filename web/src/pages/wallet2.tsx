import { BackButton } from 'components/Buttons/BackButton';
import { Jazzicon } from 'components/Jazzicon';
import { Layout } from 'components/Layout';
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
import { Matic2 } from 'icons/Matic2';
import { MetaMask } from 'icons/MetaMask';
import { Polygon } from 'icons/Polygon';
import { DefaultWallet, useUpdateDefaultWalletMutation } from 'lib/graphql';
import Head from 'next/head';
import Link from 'next/link';
import { useState } from 'react';

const topNovaBarProps: TopNavBarProps = {
  leftButton: <BackButton />,
  title: 'Wallet',
};
export default function WalletPage() {
  const me = useMe();
  const { account, balance } = useMetaMask();
  const { account: magicAccount, balance: magicBalance } = useMagicContext();
  const [updateDefaultWallet] = useUpdateDefaultWalletMutation();
  const [selectedWallet, setSelectedWallet] = useState(DefaultWallet.Soundchain);

  const getAccount = selectedWallet === DefaultWallet.Soundchain ? magicAccount : account;

  //   console.log(web3?.eth.net.getNetworkType().then(console.log));

  interface WalletButtonProps {
    href: string;
    title: string;
    icon: (props: React.SVGProps<SVGSVGElement>) => JSX.Element;
  }
  const WalletButton = ({ href, title, icon: Icon }: WalletButtonProps) => {
    return (
      <Link href={href}>
        <a className="text-gray-80 text-xs font-bold flex flex-col items-center gap-2">
          <div className="rounded-full border-gray-50 border-2 w-10 h-10 flex justify-center items-center">
            <Icon />
          </div>
          {title}
        </a>
      </Link>
    );
  };

  return (
    <Layout topNavBarProps={topNovaBarProps} fullHeight={true}>
      <Head>
        <title>Soundchain - Wallet</title>
        <meta name="description" content="Wallet" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="h-full flex flex-col">
        <div className="flex items-center gap-2 bg-gray-15 font-bold text-xs py-4 px-2">
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
          <label className="ml-auto flex items-center gap-2">
            <span className="text-sm leading-3 font-bold text-white">Default wallet</span>
            <input
              type="checkbox"
              className="h-5 w-5 text-black bg-black border-gray-30 rounded border-2"
              onClick={() => updateDefaultWallet({ variables: { input: { defaultWallet: selectedWallet } } })}
              checked={me?.defaultWallet === selectedWallet}
            />
          </label>
        </div>
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
              }}
              type="button"
            >
              <Copy />
              <span className="text-gray-80 uppercase leading-none">copy</span>
            </button>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Matic2 />
            <span className="text-blue-400 font-bold text-xs uppercase mt-2">
              <strong className="text-white font-bold text-2xl">
                {selectedWallet === DefaultWallet.Soundchain ? magicBalance : balance}
              </strong>
              {` matic`}
            </span>
            <span className="text-xs text-gray-50 font-bold">{'$xx.xx USD'}</span>
          </div>
          <div className="flex gap-5 mt-4">
            <WalletButton href="/wallet/transfer" title="Activity" icon={Activity} />
            <WalletButton href="/wallet/transfer" title="Receive" icon={ArrowDown} />
            <WalletButton href="/wallet/transfer" title="Buy" icon={CreditCard} />
            <WalletButton href="/wallet/transfer" title="Send" icon={ArrowUpRight} />
          </div>
        </div>
        <div className="p-3 mt-3">
          <span className="text-gray-80 font-bold">Owned NFT’s</span>
        </div>
      </div>
    </Layout>
  );
}
