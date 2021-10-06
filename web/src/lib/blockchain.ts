import axios from 'axios';
import { Metadata, NftToken } from 'types/NftTypes';
import Web3 from 'web3';
import { AbiItem } from 'web3-utils';
import soundchainContract from '../contract/SoundchainCollectible.sol/SoundchainCollectible.json';

const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
const gas = 1200000;

export const getIpfsAssetUrl = (uri: string) => {
  const [protocol, urn] = uri.split('//');
  return protocol === 'ipfs:' ? 'https://soundchain.mypinata.cloud/ipfs/' + urn : uri;
};

export const getNftTokensFromContract = async (web3: Web3, account: string) => {
  const tokens: NftToken[] = [];
  try {
    // temporary iteration over old cotract number so
    for (const contractAddr of [contractAddress, '0x1Ca9E523a3D4D2A771e22aaAf51EAB33108C6b2C']) {
      const contract = new web3.eth.Contract(soundchainContract.abi as AbiItem[], contractAddr);
      const balance = await contract.methods.balanceOf(account).call();

      for (let tokenIndex = 0; tokenIndex < balance; tokenIndex++) {
        const tokenId = await contract.methods.tokenOfOwnerByIndex(account, tokenIndex).call();
        const tokenURI = await contract.methods.tokenURI(tokenId).call();
        try {
          const { data } = await axios.get<Metadata>(getIpfsAssetUrl(tokenURI));
          tokens.push({ ...data, tokenId });
        } catch (error) {
          console.error('Unable to read token meta ', error);
        }
      }
    }
  } catch (error) {
    console.error('Unable to get tokens info ', error);
  }
  return tokens;
};

export const burnNftToken = (web3: Web3, tokenId: string, address: string) => {
  const contract = new web3.eth.Contract(soundchainContract.abi as AbiItem[], contractAddress);
  return maxGasFeeAlert(web3, async () => await contract.methods.burn(tokenId).send({ from: address, gas }));
};

export const transferNftToken = (web3: Web3, tokenId: string, fromAddress: string, toAddress: string) => {
  const contract = new web3.eth.Contract(soundchainContract.abi as AbiItem[], contractAddress);
  return maxGasFeeAlert(
    web3,
    async () =>
      await contract.methods.safeTransferFrom(fromAddress, toAddress, tokenId).send({ from: fromAddress, gas }),
  );
};

export const mintNftToken = (web3: Web3, uri: string, fromAddress: string, toAddress: string) => {
  const contract = new web3.eth.Contract(soundchainContract.abi as AbiItem[], contractAddress);
  return maxGasFeeAlert(
    web3,
    async () => await contract.methods.safeMint(toAddress, uri).send({ from: fromAddress, gas }),
  );
};

const maxGasFeeAlert = async (web3: Web3, method: () => unknown) => {
  const gasPriceWei = await web3.eth.getGasPrice();
  const gasPrice = parseInt(web3.utils.fromWei(gasPriceWei, 'Gwei'));
  const maxFeeWei = gasPrice * gas;

  if (confirm(`Total fee: ${web3.utils.fromWei(maxFeeWei.toString(), 'Gwei')} MATIC`)) {
    return await method();
  }
};
