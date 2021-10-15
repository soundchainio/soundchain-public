import axios from 'axios';
import { Metadata, NftToken, Receipt } from 'types/NftTypes';
import Web3 from 'web3';
import { AbiItem } from 'web3-utils';
import soundchainContract from '../contract/SoundchainCollectible/SoundchainCollectible.json';
import soundchainMarketplace from '../contract/SoundchainMarketplace/SoundchainMarketplace.json';

const nftAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as string;
const marketplaceAddress = process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS;
const gas = 1200000;

export const getIpfsAssetUrl = (uri: string) => {
  const [protocol, urn] = uri.split('//');
  return protocol === 'ipfs:' ? 'https://soundchain.mypinata.cloud/ipfs/' + urn : uri;
};

export const getNftTokensFromContract = async (web3: Web3, account: string) => {
  const tokens: NftToken[] = [];
  try {
    // temporary iteration over old contract number so
    const nftContract = new web3.eth.Contract(soundchainContract.abi as AbiItem[], nftAddress);
    const marketplaceContract = new web3.eth.Contract(soundchainMarketplace.abi as AbiItem[], marketplaceAddress);
    const numberOfTokens = await nftContract.methods._tokenIdCounter().call();

    for (let tokenId = 0; tokenId < numberOfTokens; tokenId++) {
      const balance = await nftContract.methods.balanceOf(account, tokenId).call();
      if (parseInt(balance) == 0) {
        continue;
      }
      const tokenURI = await nftContract.methods.uri(tokenId).call();
      const { pricePerItem, quantity, startingTime } = await marketplaceContract.methods
        .listings(nftAddress, tokenId, account)
        .call();
      try {
        const { data } = await axios.get<Metadata>(getIpfsAssetUrl(tokenURI));
        tokens.push({
          ...data,
          tokenId: tokenId.toString(),
          pricePerItem,
          quantity,
          startingTime,
          contractAddress: nftAddress,
        });
      } catch (error) {
        console.error('Unable to read token meta ', error);
      }
    }
  } catch (error) {
    console.error('Unable to get tokens info ', error);
  }
  return tokens;
};

export const burnNftToken = (web3: Web3, tokenId: string, from: string) => {
  const contract = new web3.eth.Contract(soundchainContract.abi as AbiItem[], nftAddress);
  return maxGasFeeAlert(web3, async () => await contract.methods.burn(tokenId).send({ from, gas }));
};

export const approveMarketplace = (web3: Web3, from: string, onReceipt: (receipt: Receipt) => void) => {
  const contract = new web3.eth.Contract(soundchainContract.abi as AbiItem[], nftAddress);
  contract.methods.setApprovalForAll(marketplaceAddress, true).send({ from, gas }).on('receipt', onReceipt);
};

export const listItem = (web3: Web3, tokenId: string, quantity: number, from: string, price: number) => {
  const contract = new web3.eth.Contract(soundchainMarketplace.abi as AbiItem[], marketplaceAddress);
  return maxGasFeeAlert(
    web3,
    async () => await contract.methods.listItem(nftAddress, tokenId, quantity, price, 0).send({ from, gas }),
  );
};

export const cancelListing = (web3: Web3, tokenId: string, from: string) => {
  const contract = new web3.eth.Contract(soundchainMarketplace.abi as AbiItem[], marketplaceAddress);
  return maxGasFeeAlert(
    web3,
    async () => await contract.methods.cancelListing(nftAddress, tokenId).send({ from, gas }),
  );
};

export const updateListing = (web3: Web3, tokenId: string, from: string, price: number) => {
  const contract = new web3.eth.Contract(soundchainMarketplace.abi as AbiItem[], marketplaceAddress);
  return maxGasFeeAlert(
    web3,
    async () => await contract.methods.updateListing(nftAddress, tokenId, price).send({ from, gas }),
  );
};

export const buyItem = (web3: Web3, tokenId: string, from: string, owner: string) => {
  const contract = new web3.eth.Contract(soundchainMarketplace.abi as AbiItem[], marketplaceAddress);
  return maxGasFeeAlert(
    web3,
    async () => await contract.methods.buyItem(nftAddress, tokenId, owner).send({ from, gas }),
  );
};

export const registerRoyalty = (web3: Web3, tokenId: string, from: string, royalty: number) => {
  const contract = new web3.eth.Contract(soundchainMarketplace.abi as AbiItem[], marketplaceAddress);
  return maxGasFeeAlert(
    web3,
    async () => await contract.methods.registerRoyalty(nftAddress, tokenId, royalty).send({ from, gas }),
  );
};

export const transferNftToken = (web3: Web3, tokenId: string, from: string, toAddress: string, amount: number) => {
  const contract = new web3.eth.Contract(soundchainContract.abi as AbiItem[], nftAddress);
  const nullBytes = '0x0000000000000000000000000000000000000000000000000000000000000000';
  return maxGasFeeAlert(
    web3,
    async () =>
      await contract.methods.safeTransferFrom(from, toAddress, tokenId, amount, nullBytes).send({ from, gas }),
  );
};

export const isTokenOwner = async (web3: Web3, tokenId: string, from: string) => {
  const nftContract = new web3.eth.Contract(soundchainContract.abi as AbiItem[], nftAddress);
  const balance = await nftContract.methods.balanceOf(from, tokenId).call();
  return balance > 0;
};

export const mintNftToken = (
  web3: Web3,
  uri: string,
  from: string,
  toAddress: string,
  amount: number,
  onTransactionHash: (hash: string) => void,
  onReceipt: (receipt: Receipt) => void,
) => {
  const contract = new web3.eth.Contract(soundchainContract.abi as AbiItem[], nftAddress);
  // https://web3js.readthedocs.io/en/v1.5.2/web3-eth-contract.html#methods-mymethod-send
  // check event emitters transactionHash | confirmation | receipt
  contract.methods
    .mint(toAddress, amount, uri)
    .send({ from, gas })
    .on('transactionHash', onTransactionHash)
    .on('receipt', onReceipt);
};

export const getMaxGasFee = async (web3: Web3) => {
  const gasPriceWei = await web3.eth.getGasPrice();
  const gasPrice = parseInt(web3.utils.fromWei(gasPriceWei, 'Gwei'));
  const maxFeeWei = gasPrice * gas;
  return web3.utils.fromWei(maxFeeWei.toString(), 'Gwei');
};

const maxGasFeeAlert = async (web3: Web3, method: () => unknown) => {
  const gasPriceWei = await web3.eth.getGasPrice();
  const gasPrice = parseInt(web3.utils.fromWei(gasPriceWei, 'Gwei'));
  const maxFeeWei = gasPrice * gas;

  if (confirm(`Total fee: ${web3.utils.fromWei(maxFeeWei.toString(), 'Gwei')} MATIC`)) {
    return await method();
  }
};
