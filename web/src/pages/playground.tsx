import { Button } from 'components/Button';
import { TrackForm } from 'components/forms/track/TrackForm';
import { Layout } from 'components/Layout';
import { NFTCard } from 'components/NftCard';
import { Subtitle } from 'components/Subtitle';
import useMetaMask from 'hooks/useMetaMask';
import { getNftTokensFromContract } from 'lib/blockchain';
import Head from 'next/head';
import { useEffect, useState } from 'react';
import { NftToken } from 'types/NftTypes';

export default function PlaygroundPage() {
  const { account, balance, web3, connect } = useMetaMask();
  const [nfts, setNfts] = useState<NftToken[]>();
  const [currentTab, setCurrentTab] = useState<'COLLECTION' | 'MINTING'>('COLLECTION');

  useEffect(() => {
    if (account && web3) {
      getNftTokensFromContract(web3, account).then(setNfts);
    } else {
      setNfts(undefined);
    }
  }, [account]);

  return (
    <Layout>
      <Head>
        <title>Soundchain</title>
        <meta name="description" content="Soundchain" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="my-8">
        <Subtitle>{`Metamask address: ${account}`}</Subtitle>
        <Subtitle>{`Metamask balance: ${balance}`}</Subtitle>
        {!account && (
          <Button className="max-w-xs" onClick={() => connect()}>
            Connect to MetaMask
          </Button>
        )}
      </div>
      <div className="flex space-x-4 my-8 w-full text-white">
        <div className="flex text-sm font-semibold text-center">
          <div className="text-white flex-grow">
            <div
              className={`${currentTab == 'COLLECTION' ? 'text-white' : 'text-gray-50'} px-4 cursor-pointer`}
              onClick={() => setCurrentTab('COLLECTION')}
            >
              Collection
            </div>
            {currentTab == 'COLLECTION' ? (
              <div className="h-[2px] bg-gradient-to-r from-[#FF9191] to-[#CF6161] mt-1.5"></div>
            ) : (
              <div className="h-[2px] bg-gray-30 mt-1.5"></div>
            )}
          </div>
          <div className="flex-grow">
            <div
              className={`${currentTab == 'MINTING' ? 'text-white' : 'text-gray-50'} px-4 cursor-pointer`}
              onClick={() => setCurrentTab('MINTING')}
            >
              Minting
            </div>
            {currentTab == 'MINTING' ? (
              <div className="h-[2px] bg-gradient-to-r from-[#FF9191] to-[#CF6161] mt-1.5"></div>
            ) : (
              <div className="h-[2px] bg-gray-30 mt-1.5"></div>
            )}
          </div>
        </div>
      </div>

      <div className="my-8 w-full text-white">
        <div className={`${currentTab == 'COLLECTION' ? 'block' : 'hidden'} flex space-x-4`}>
          {nfts &&
            nfts.map((nft, idx) => (
              <div key={idx} className="my-4 bg-rainbow-gradient max-w-md flex flex-row justify-center p-2">
                <div key={idx} className="bg-black p-2">
                  <NFTCard account={account!} web3={web3!} nftToken={nft} />
                </div>
              </div>
            ))}
        </div>
        <div className={`${currentTab == 'MINTING' ? 'block' : 'hidden'}`}>
          <TrackForm afterSubmit={() => console.log('nice')} />
        </div>
      </div>
    </Layout>
  );
}
