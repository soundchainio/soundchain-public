import { Button } from 'components/Button';
import { Layout } from 'components/Layout';
import { NFTCard } from 'components/NftCard';
import { Subtitle } from 'components/Subtitle';
import { useMagicContext } from 'hooks/useMagicContext';
import useMetaMask from 'hooks/useMetaMask';
import { getNftTokensFromContract } from 'lib/blockchain';
import { testNetwork } from 'lib/blockchainNetworks';
import Head from 'next/head';
import { useEffect, useState } from 'react';
import { NftToken } from 'types/NftTypes';

export default function PlaygroundPage() {
  const { account, balance, web3, chainId, connect } = useMetaMask();
  const { account: magicAccount, web3: magicWeb3, balance: magicBalance } = useMagicContext();
  const [metaMaskNfts, setMetaMaskNfts] = useState<NftToken[]>();
  const [magicNfts, setMagicNfts] = useState<NftToken[]>();
  const [loading, setLoading] = useState(true);
  const [testnet, setTestnet] = useState(true);
  const [connectedToMetaMask, setConnectedToMetaMask] = useState(false);

  useEffect(() => {
    if (magicAccount && magicWeb3) {
      getNftTokensFromContract(magicWeb3, magicAccount).then(result => {
        setMagicNfts(result);
        setLoading(false);
      });
    }
    setLoading(true);
  }, [magicAccount, magicWeb3]);

  useEffect(() => {
    if (!account || !web3) {
      setConnectedToMetaMask(false);
      setLoading(false);
      setMetaMaskNfts(undefined);
      return;
    }
    setConnectedToMetaMask(true);

    if (chainId !== testNetwork.id) {
      setTestnet(false);
      setLoading(false);
      return;
    }
    setTestnet(true);

    setLoading(true);
    getNftTokensFromContract(web3, account).then(result => {
      setMetaMaskNfts(result);
      setLoading(false);
    });
  }, [account, chainId, web3]);

  return (
    <Layout>
      <Head>
        <title>Soundchain</title>
        <meta name="description" content="Soundchain" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="my-8 flex flex-col gap-4">
        <div>
          {magicAccount && <Subtitle>{`Soundchain address: ${magicAccount}`}</Subtitle>}
          {magicBalance && <Subtitle>{`Soundchain balance: ${magicBalance}`}</Subtitle>}
        </div>
        <div>
          {account && <Subtitle>{`Metamask address: ${account}`}</Subtitle>}
          {balance && <Subtitle>{`Metamask balance: ${balance}`}</Subtitle>}
        </div>
        {!connectedToMetaMask && (
          <div className="flex gap-4">
            <Button variant="rainbow-xs" className="max-w-xs hidden lg:block" onClick={() => connect()}>
              Connect to MetaMask Wallet
            </Button>
          </div>
        )}
        <div className="text-white">
          Need some test Matic?{' '}
          <a
            className="text-sm yellow-gradient-text font-bold"
            href="https://faucet.polygon.technology/"
            target="_blank"
            rel="noreferrer"
          >
            Get some here
          </a>
        </div>
      </div>
      <div className="my-8 w-full text-white">
        <Subtitle className="mb-2">Soundchain Collection</Subtitle>
        <TabContent loading={loading} connected={!!magicAccount} testnet>
          <div className="flex flex-wrap gap-4 mb-4">
            {magicNfts?.map((nft, idx) => (
              <div key={idx} className="bg-rainbow-gradient w-96 flex flex-row justify-center p-2">
                <div key={idx} className="bg-black p-2 w-full">
                  <NFTCard account={magicAccount!} web3={magicWeb3!} nftToken={nft} />
                </div>
              </div>
            ))}
            {!magicNfts && <div>Your collection is empty :(</div>}
          </div>
        </TabContent>
        <Subtitle className="mb-2">MetaMask Collection</Subtitle>
        <TabContent loading={loading} connected={connectedToMetaMask} testnet={testnet}>
          <div className="flex flex-wrap gap-4">
            {metaMaskNfts?.map((nft, idx) => (
              <div key={idx} className="bg-rainbow-gradient w-96 flex flex-row justify-center p-2">
                <div key={idx} className="bg-black p-2 w-full">
                  <NFTCard account={account!} web3={web3!} nftToken={nft} />
                </div>
              </div>
            ))}
            {!metaMaskNfts && <div>Your collection is empty :(</div>}
          </div>
        </TabContent>
      </div>
    </Layout>
  );
}

const TabContent = (props: React.PropsWithChildren<{ loading: boolean; connected: boolean; testnet: boolean }>) => {
  const { loading, connected, testnet, children } = props;

  if (loading) {
    return <Loading />;
  }

  if (!connected) {
    return <NotConnected />;
  }

  if (!testnet) {
    return <NotTestnet />;
  }

  return <div>{children}</div>;
};

const NotTestnet = () => {
  const { addMumbaiTestnet } = useMetaMask();
  return (
    <div>
      <div className="text-white">{`It seems you might not be connected to Mumbai Testnet.`}</div>
      <div className="text-white mt-4 max-w-sm">
        <Button variant="rainbow-xs" onClick={() => addMumbaiTestnet()}>
          Connect to Mumbai Testnet
        </Button>
      </div>
    </div>
  );
};

const NotConnected = () => {
  return <div className="text-white">{`It seems you might not be connected to any wallet.`}</div>;
};

const Loading = () => {
  return <div className="text-white">Loading...</div>;
};
