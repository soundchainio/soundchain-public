import axios from 'axios';
import { Layout } from 'components/Layout';
import useMetaMask from 'hooks/useMetaMask';
import Head from 'next/head';
import { useEffect, useState } from 'react';
import { Metadata } from 'types/NFT';
import Web3 from 'web3';
import { AbiItem } from 'web3-utils';
import { abi } from '../contract/SoundchainCollectible.sol/SoundchainCollectible.json';

export default function PlaygroundPage() {
  const { account, balance, web3, connect } = useMetaMask();
  const [NFTs, setNFTs] = useState<Metadata[]>();

  useEffect(() => {
    if (account && web3) {
      getAssetsFromPolygon(account, web3).then(setNFTs);
    }
  }, [account]);

  return (
    <Layout>
      <Head>
        <title>Soundchain</title>
        <meta name="description" content="Soundchain" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="m-8">
        <div className="text-white">Metamask address {account}</div>
        <div className="text-white">Metamask balance {balance}</div>
        <button onClick={() => connect()} disabled={!!account} className="text-white">
          {account ? 'Connected to MetaMask' : 'Connect to MetaMask'}
        </button>
      </div>
      {NFTs && NFTs.map(nft => <NFTCard key={nft.name} {...nft} />)}
    </Layout>
  );
}

const NFTCard = ({ asset, name, description, art, attributes }: Metadata) => {
  const assetURL = getAssetURL(asset);
  const [mimeType, setMimeType] = useState<string>();

  useEffect(() => {
    axios.head(assetURL).then(({ headers }) => {
      setMimeType(headers['content-type']);
    });
  }, [assetURL]);

  if (!mimeType) return <div className="text-white">Loading...</div>;

  return (
    <div className="m-8">
      <div className="text-white">{name}</div>
      <div className="text-white">{description}</div>
      {attributes &&
        attributes.map(({ trait_type, trait_value }) => (
          <div key={trait_type} className="text-white">{`${trait_type}: ${trait_value}`}</div>
        ))}
      {mimeType === 'video/mp4' && <video src={assetURL} controls className="max-w-lg" />}
    </div>
  );
};

const getAssetURL = (uri: string) => {
  const [protocol, urn] = uri.split('//');
  return protocol === 'ipfs:' ? 'https://gateway.pinata.cloud/ipfs/' + urn : uri;
};

const getAssetsFromPolygon = async (address: string, web3: Web3) => {
  const tokens: Metadata[] = [];
  try {
    // TODO: add async/multi-thread process
    const contract = new web3.eth.Contract(abi as AbiItem[], '0x1Ca9E523a3D4D2A771e22aaAf51EAB33108C6b2C');

    const balance = await contract.methods.balanceOf(address).call();

    for (let tokenIndex = 0; tokenIndex < balance; tokenIndex++) {
      const tokenId = await contract.methods.tokenOfOwnerByIndex(address, tokenIndex).call();
      const tokenURI = await contract.methods.tokenURI(tokenId).call();
      // const contractName = await contract.methods.name().call()
      // const contractSymbol = await contract.methods.symbol().call()
      try {
        const { data } = await axios.get<Metadata>(getAssetURL(tokenURI));
        tokens.push(data);
      } catch (error) {
        console.error('Unable to read token meta ', error);
      }
    }
  } catch (error) {
    console.error('Unable to get tokens info ', error);
  }
  return tokens;
};
