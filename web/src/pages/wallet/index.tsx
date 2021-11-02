import { Button } from 'components/Button';
import { BackButton } from 'components/Buttons/BackButton';
import { Layout } from 'components/Layout';
import { TopNavBarProps } from 'components/TopNavBar';
import { Wallet } from 'components/Wallet';
import { useMagicContext } from 'hooks/useMagicContext';
import { useMe } from 'hooks/useMe';
import useMetaMask from 'hooks/useMetaMask';
import { Logo } from 'icons/Logo';
import { Matic } from 'icons/Matic';
import { MetaMask } from 'icons/MetaMask';
import { testNetwork } from 'lib/blockchainNetworks';
import { DefaultWallet, useUpdateDefaultWalletMutation } from 'lib/graphql';
import Head from 'next/head';
import { useEffect, useState } from 'react';

const topNovaBarProps: TopNavBarProps = {
  leftButton: <BackButton />,
  title: 'Wallet',
};

export default function WalletPage() {
  const me = useMe();
  const [updateDefaultWallet] = useUpdateDefaultWalletMutation();
  const { account, balance, web3, chainId, connect } = useMetaMask();
  const { account: magicAccount, balance: magicBalance } = useMagicContext();
  const [testnet, setTestnet] = useState(true);
  const [connectedToMetaMask, setConnectedToMetaMask] = useState(false);

  useEffect(() => {
    if (!account) {
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
      <div className="h-full flex flex-col justify-between items-center">
        <div className="h-full w-full flex flex-col justify-between space-y-6 items-center">
          <div className="bg-gray-15 w-full">
            {magicAccount && (
              <Wallet
                title="Soundchain Wallet"
                icon={() => <Logo id="soundchain-wallet" height="20" width="20" />}
                correctNetwork={true}
                balance={magicBalance}
                account={magicAccount}
                showActionButtons={true}
                defaultWallet={me.defaultWallet === DefaultWallet.Soundchain}
                onDefaultWalletClick={() =>
                  updateDefaultWallet({ variables: { input: { defaultWallet: DefaultWallet.Soundchain } } })
                }
              />
            )}
          </div>
          <div className="bg-gray-15 w-full">
            {connectedToMetaMask ? (
              <Wallet
                title="MetaMask Wallet"
                icon={MetaMask}
                correctNetwork={testnet}
                balance={balance}
                account={account}
                defaultWallet={me.defaultWallet === DefaultWallet.MetaMask}
                onDefaultWalletClick={() =>
                  updateDefaultWallet({ variables: { input: { defaultWallet: DefaultWallet.MetaMask } } })
                }
              />
            ) : (
              <div className="flex justify-center items-center py-6">
                <Button variant="rainbow-xs" className="max-w-xs" onClick={() => connect()}>
                  Connect to MetaMask Wallet
                </Button>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center justify-center">
          <a
            className="text-xs text-gray-80 font-bold underline m-2"
            href="https://faucet.polygon.technology/"
            target="_blank"
            rel="noreferrer"
          >
            Need some Matic?
          </a>
          <span className="my-auto mr-2">
            <Matic />
          </span>
        </div>
      </div>
    </Layout>
  );
}
