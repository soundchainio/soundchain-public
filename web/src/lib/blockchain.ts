import axios from 'axios';
import { Metadata, NftToken } from 'types/NftTypes';
import Web3 from 'web3';
import { AbiItem } from 'web3-utils';
import { abi } from '../contract/SoundchainCollectible.sol/SoundchainCollectible.json';

const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;

export const getIpfsAssetUrl = (uri: string) => {
  const [protocol, urn] = uri.split('//');
  return protocol === 'ipfs:' ? 'https://soundchain.mypinata.cloud/ipfs/' + urn : uri;
};

export const getNftTokensFromContract = async (web3: Web3, account: string) => {
  const tokens: NftToken[] = [];
  try {
    const contract = new web3.eth.Contract(abi as AbiItem[], contractAddress);
    const balance = await contract.methods.balanceOf(account).call();

    for (let tokenIndex = 0; tokenIndex < balance; tokenIndex++) {
      const tokenId = await contract.methods.tokenOfOwnerByIndex(account, tokenIndex).call();
      const tokenURI = await contract.methods.tokenURI(tokenId).call();
      // const contractName = await contract.methods.name().call()
      // const contractSymbol = await contract.methods.symbol().call()
      try {
        const { data } = await axios.get<Metadata>(getIpfsAssetUrl(tokenURI));
        tokens.push({ ...data, tokenId });
      } catch (error) {
        console.error('Unable to read token meta ', error);
      }
    }
  } catch (error) {
    console.error('Unable to get tokens info ', error);
  }
  return tokens;
};

export const burnNftToken = async (web3: Web3, tokenId: string, account: string) => {
  const contract = new web3.eth.Contract(abi as AbiItem[], contractAddress);
  return await contract.methods.burn(tokenId).send({ from: account });
};
