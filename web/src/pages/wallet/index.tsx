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


const topNovaBarProps: TopNavBarProps = {
  leftButton: <BackButton />,
  title: 'Wallet'
};

export default function WalletPage() {
  const me = useMe();

  const { account, balance, web3, chainId, connect } = useMetaMask();
  const { account: magicAccount, connect: magicConnect, web3: magicWeb3, balance: magicBalance } = useMagic();
  const [loading, setLoading] = useState(true);
  const [testnet, setTestnet] = useState(true);
  const [mainnet, setMainnet] = useState(true);
  const [connectedToMetaMask, setConnectedToMetaMask] = useState(false);

  useEffect(() => {
    if (magicAccount && magicWeb3) {
      setLoading(false);
    }
    setLoading(true);
  }, [magicAccount, magicWeb3]);

  useEffect(() => {
    if (!account || !web3) {
      setConnectedToMetaMask(false);
      setLoading(false);
      return;
    }
    setConnectedToMetaMask(true);

    if (chainId !== testNetwork.id) {
      setTestnet(false);
      setLoading(false);
      return;
    }
    setTestnet(true);
  }, [account, chainId, web3]);

  if (!me) return null;

  console.log({web3})

  return (
    <Layout topNavBarProps={topNovaBarProps} fullHeight={true}>
      <Head>
        <title>Soundchain - Account Settings</title>
        <meta name="description" content="Account Settings" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="h-full flex flex-col justify-between items-center">
        <div className="bg-gray-15 w-full py-8">
          {!magicAccount && (
            <div className="flex justify-center items-center">
              <Button variant="rainbow-xs" className="max-w-xs" onClick={() => magicConnect()}>
                Connect to Soundchain Wallet
              </Button>
            </div>
          )}
          
        </div>
        <div className="bg-gray-15 w-full"> 
          {connectedToMetaMask ? 
            <Wallet title="MetaMask Wallet" icon={MetaMask} correctNetwork={testnet} balance={balance} account={account}/>
           :
            <div className="p-10">
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