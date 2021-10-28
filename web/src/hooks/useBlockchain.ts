import { SDKBase } from '@magic-sdk/provider';
import axios from 'axios';
import { config } from 'config';
import { magic } from 'hooks/useMagicContext';
import { useMe } from 'hooks/useMe';
import { Metadata, NftToken, Receipt } from 'types/NftTypes';
import Web3 from 'web3';
import { TransactionReceipt } from 'web3-core/types';
import { AbiItem } from 'web3-utils';
import soundchainContract from '../contract/SoundchainCollectible/SoundchainCollectible.json';
import soundchainMarketplace from '../contract/SoundchainMarketplace/SoundchainMarketplace.json';

const nftAddress = config.contractAddress as string;
const marketplaceAddress = config.marketplaceAddress;
export const gas = 1200000;

const useBlockchain = () => {
  const me = useMe();

  const beforeSending = async (web3: Web3, method: () => unknown) => {
    if ((web3.currentProvider as SDKBase['rpcProvider']).isMagic) {
      if (!(await magic.user.isLoggedIn()) && me) {
        await magic.auth.loginWithMagicLink({ email: me?.email });
      }
    }
    return await method();
  };

  const getIpfsAssetUrl = (uri: string) => {
    const [protocol, urn] = uri.split('//');
    return protocol === 'ipfs:' ? config.ipfsGateway + urn : uri;
  };

  const getNftTokensFromContract = async (web3: Web3, account: string) => {
    const tokens: NftToken[] = [];
    try {
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
            tokenId,
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

  const burnNftToken = (web3: Web3, tokenId: number, from: string) => {
    const contract = new web3.eth.Contract(soundchainContract.abi as AbiItem[], nftAddress);
    return beforeSending(web3, async () => await contract.methods.burn(from, tokenId, 1).send({ from, gas }));
  };

  const approveMarketplace = (web3: Web3, from: string, onReceipt: (receipt: Receipt) => void) => {
    const contract = new web3.eth.Contract(soundchainContract.abi as AbiItem[], nftAddress);
    return beforeSending(
      web3,
      async () =>
        await contract.methods.setApprovalForAll(marketplaceAddress, true).send({ from, gas }).on('receipt', onReceipt),
    );
  };

  const listItem = (
    web3: Web3,
    tokenId: number,
    quantity: number,
    from: string,
    price: string,
    royalty = 0,
    onReceipt: (receipt: Receipt) => void,
  ) => {
    const contract = new web3.eth.Contract(soundchainMarketplace.abi as AbiItem[], marketplaceAddress);
    return beforeSending(
      web3,
      async () =>
        await contract.methods
          .listItem(nftAddress, tokenId, quantity, price, 0, royalty)
          .send({ from, gas })
          .on('receipt', onReceipt),
    );
  };

  const cancelListing = (web3: Web3, tokenId: number, from: string, onReceipt: (receipt: Receipt) => void) => {
    const contract = new web3.eth.Contract(soundchainMarketplace.abi as AbiItem[], marketplaceAddress);
    return beforeSending(
      web3,
      async () =>
        await contract.methods.cancelListing(nftAddress, tokenId).send({ from, gas }).on('receipt', onReceipt),
    );
  };

  const updateListing = (
    web3: Web3,
    tokenId: number,
    from: string,
    price: string,
    onReceipt: (receipt: Receipt) => void,
  ) => {
    const contract = new web3.eth.Contract(soundchainMarketplace.abi as AbiItem[], marketplaceAddress);
    return beforeSending(
      web3,
      async () =>
        await contract.methods.updateListing(nftAddress, tokenId, price).send({ from, gas }).on('receipt', onReceipt),
    );
  };

  const buyItem = (
    web3: Web3,
    tokenId: number,
    from: string,
    owner: string,
    value: string,
    onReceipt: (receipt: Receipt) => void,
  ) => {
    const contract = new web3.eth.Contract(soundchainMarketplace.abi as AbiItem[], marketplaceAddress);
    return beforeSending(
      web3,
      async () =>
        await contract.methods.buyItem(nftAddress, tokenId, owner).send({ from, gas, value }).on('receipt', onReceipt),
    );
  };

  const registerRoyalty = (web3: Web3, tokenId: number, from: string, royalty: number) => {
    const contract = new web3.eth.Contract(soundchainMarketplace.abi as AbiItem[], marketplaceAddress);
    return beforeSending(
      web3,
      async () => await contract.methods.registerRoyalty(nftAddress, tokenId, royalty).send({ from, gas }),
    );
  };

  const transferNftToken = (web3: Web3, tokenId: number, from: string, toAddress: string, amount: number) => {
    const contract = new web3.eth.Contract(soundchainContract.abi as AbiItem[], nftAddress);
    const nullBytes = '0x0000000000000000000000000000000000000000000000000000000000000000';
    return beforeSending(
      web3,
      async () =>
        await contract.methods.safeTransferFrom(from, toAddress, tokenId, amount, nullBytes).send({ from, gas }),
    );
  };

  const transfer = (
    web3: Web3,
    to: string,
    from: string,
    amount: string,
    onTransactionHash: (hash: string) => void,
    onReceipt: (receipt: TransactionReceipt) => void,
  ) => {
    const amountWei = web3.utils.toWei(amount);
    beforeSending(web3, () =>
      web3.eth
        .sendTransaction({
          from: from,
          to: to,
          value: amountWei,
        })
        .on('transactionHash', onTransactionHash)
        .on('receipt', onReceipt),
    );
  };

  const isTokenOwner = async (web3: Web3, tokenId: number, from: string) => {
    const nftContract = new web3.eth.Contract(soundchainContract.abi as AbiItem[], nftAddress);
    const balance = await nftContract.methods.balanceOf(from, tokenId).call();
    return balance > 0;
  };

  const mintNftToken = (
    web3: Web3,
    uri: string,
    from: string,
    toAddress: string,
    amount: number,
    onTransactionHash: (hash: string) => void,
    onReceipt: (receipt: Receipt) => void,
  ) => {
    const contract = new web3.eth.Contract(soundchainContract.abi as AbiItem[], nftAddress);
    beforeSending(web3, () =>
      contract.methods
        .mint(toAddress, amount, uri)
        .send({ from, gas })
        .on('transactionHash', onTransactionHash)
        .on('receipt', onReceipt),
    );
  };

  const isApproved = async (web3: Web3, from: string) => {
    const nftContract = new web3.eth.Contract(soundchainContract.abi as AbiItem[], nftAddress);
    return await nftContract.methods.isApprovedForAll(from, marketplaceAddress).call();
  };

  const getMaxGasFee = async (web3: Web3) => {
    const gasPriceWei = await web3.eth.getGasPrice();
    const gasPrice = parseInt(web3.utils.fromWei(gasPriceWei, 'Gwei'));
    const maxFeeWei = gasPrice * gas;
    return web3.utils.fromWei(maxFeeWei.toString(), 'Gwei');
  };

  const getCurrentGasPrice = async (web3: Web3) => {
    const gasPriceWei = await web3.eth.getGasPrice();
    return web3.utils.fromWei(gasPriceWei, 'ether');
  };

  return {
    burnNftToken,
    getNftTokensFromContract,
    approveMarketplace,
    listItem,
    cancelListing,
    updateListing,
    buyItem,
    registerRoyalty,
    transferNftToken,
    isTokenOwner,
    mintNftToken,
    getMaxGasFee,
    getCurrentGasPrice,
    getIpfsAssetUrl,
    transfer,
    isApproved,
  };
};

export default useBlockchain;
