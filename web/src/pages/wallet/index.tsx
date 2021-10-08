import { TopNavBarProps } from 'components/TopNavBar';
import { BackButton } from 'components/Buttons/BackButton';
import { useMe } from 'hooks/useMe';
import { useEffect, useState } from 'react';
import { Layout } from 'components/Layout';
import Head from 'next/head';
import useMagic from 'hooks/useMagic';
import useMetaMask from 'hooks/useMetaMask';
import { testNetwork } from 'lib/blockchainNetworks';
import { Button } from 'components/Button';
import { Wallet } from 'components/Wallet';
import { MetaMask } from 'icons/MetaMask';
import { Logo } from 'icons/Logo';

const topNovaBarProps: TopNavBarProps = {
  leftButton: <BackButton />,
  title: 'Wallet'
};

export default function WalletPage() {
  const me = useMe();
  const { account, balance, web3, chainId, connect } = useMetaMask();
  const { account: magicAccount, connect: magicConnect, balance: magicBalance } = useMagic();
  const [testnet, setTestnet] = useState(true);
  const [connectedToMetaMask, setConnectedToMetaMask] = useState(false);

  useEffect(() => {
    if (!account || !web3) {
      setConnectedToMetaMask(false);
      return;
    }
    setConnectedToMetaMask(true);

    if (chainId !== testNetwork.id) {
      setTestnet(false);
      return;
    }
    setTestnet(true);
  }, [account, chainId, web3]);

  if (!me) return null;

  return (
    <Layout topNavBarProps={topNovaBarProps} fullHeight={true}>
      <Head>
        <title>Soundchain - Wallet</title>
        <meta name="description" content="Wallet" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="h-full flex flex-col justify-between space-y-6 items-center">
        <div className="bg-gray-15 w-full">
          {magicAccount ?
            <Wallet title="Soundchain Wallet" icon={() => <Logo id="soundchain-wallet" height="20" width="20" />} correctNetwork={testnet} balance={magicBalance} account={magicAccount} showActionButtons={true}/>
          : 
            <div className="flex justify-center items-center py-6">
              <Button variant="rainbow-xs" className="max-w-xs" onClick={() => magicConnect()}>
                Connect to Soundchain Wallet
              </Button>
            </div>
          }
        </div>
        <div className="bg-gray-15 w-full"> 
          {connectedToMetaMask ? 
            <Wallet title="MetaMask Wallet" icon={MetaMask} correctNetwork={testnet} balance={balance} account={account}/>
           :
            <div className="flex justify-center items-center py-6">
              <Button variant="rainbow-xs" className="max-w-xs" onClick={() => connect()}>
                Connect to MetaMask Wallet
              </Button>
            </div>
          }      
        </div>
      </div>
    </Layout>
  )
}