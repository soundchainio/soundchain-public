/* eslint-disable @typescript-eslint/no-explicit-any */
import { SDKBase } from '@magic-sdk/provider';
import { config } from 'config';
import { magic } from 'hooks/useMagicContext';
import { useMe } from 'hooks/useMe';
import { useCallback } from 'react';
import { Soundchain721 } from 'types/web3-v1-contracts/Soundchain721';
import { SoundchainAuction } from 'types/web3-v1-contracts/SoundchainAuction';
import { SoundchainMarketplace } from 'types/web3-v1-contracts/SoundchainMarketplace';
import { compareWallets } from 'utils/Wallet';
import Web3 from 'web3';
import { TransactionReceipt } from 'web3-core/types';
import { AbiItem } from 'web3-utils';
import soundchainAuction from '../contract/Auction.sol/SoundchainAuction.json';
import soundchainMarketplace from '../contract/Marketplace.sol/SoundchainMarketplace.json';
import soundchainContract from '../contract/Soundchain721.sol/Soundchain721.json';

const nftAddress = config.contractAddress as string;
const marketplaceAddress = config.marketplaceAddress as string;
const auctionAddress = config.auctionAddress as string;

export const gas = 1200000;
export const applySoundchainFee = (price: number) => (price * (1 + config.soundchainFee)).toFixed();

const useBlockchain = () => {
  const me = useMe();

  const beforeSending = useCallback(
    async (web3: Web3, method: () => unknown) => {
      if ((web3.currentProvider as SDKBase['rpcProvider']).isMagic) {
        if (!(await magic.user.isLoggedIn()) && me) {
          await magic.auth.loginWithMagicLink({ email: me?.email });
        }
      }
      return await method();
    },
    [me],
  );

  const getIpfsAssetUrl = useCallback((uri: string) => {
    const [protocol, urn] = uri.split('//');
    return protocol === 'ipfs:' ? config.ipfsGateway + urn : uri;
  }, []);

  const burnNftToken = useCallback(
    (web3: Web3, tokenId: number, from: string, onConfirmation: () => void) => {
      const contract = new web3.eth.Contract(
        soundchainContract.abi as AbiItem[],
        nftAddress,
      ) as unknown as Soundchain721;
      return beforeSending(
        web3,
        async () => await contract.methods.burn(tokenId).send({ from, gas }).on('receipt', onConfirmation),
      );
    },
    [beforeSending],
  );

  const approveMarketplace = useCallback(
    (web3: Web3, from: string, onReceipt: (receipt: TransactionReceipt) => void) => {
      const contract = new web3.eth.Contract(
        soundchainContract.abi as AbiItem[],
        nftAddress,
      ) as unknown as Soundchain721;
      return beforeSending(
        web3,
        async () =>
          await contract.methods
            .setApprovalForAll(marketplaceAddress, true)
            .send({ from, gas })
            .on('receipt', onReceipt),
      );
    },
    [beforeSending],
  );

  const approveAuction = useCallback(
    (web3: Web3, from: string, onReceipt: (receipt: TransactionReceipt) => void) => {
      const contract = new web3.eth.Contract(
        soundchainContract.abi as AbiItem[],
        nftAddress,
      ) as unknown as Soundchain721;
      return beforeSending(
        web3,
        async () =>
          await contract.methods.setApprovalForAll(auctionAddress, true).send({ from, gas }).on('receipt', onReceipt),
      );
    },
    [beforeSending],
  );

  const listItem = useCallback(
    (
      web3: Web3,
      tokenId: number,
      from: string,
      price: string,
      startingTime: number,
      onTransactionHash: (hash: string) => void,
    ) => {
      const contract = new web3.eth.Contract(
        soundchainMarketplace.abi as AbiItem[],
        marketplaceAddress,
      ) as unknown as SoundchainMarketplace;
      const totalPrice = applySoundchainFee(parseInt(price));
      return beforeSending(
        web3,
        async () =>
          await contract.methods
            .listItem(nftAddress, tokenId, 1, totalPrice, startingTime)
            .send({ from, gas })
            .on('transactionHash', onTransactionHash),
      );
    },
    [beforeSending],
  );

  const cancelListing = useCallback(
    (web3: Web3, tokenId: number, from: string, onTransactionHash: (hash: string) => void) => {
      const contract = new web3.eth.Contract(
        soundchainMarketplace.abi as AbiItem[],
        marketplaceAddress,
      ) as unknown as SoundchainMarketplace;
      return beforeSending(
        web3,
        async () =>
          await contract.methods
            .cancelListing(nftAddress, tokenId)
            .send({ from, gas })
            .on('transactionHash', onTransactionHash),
      );
    },
    [beforeSending],
  );

  const updateListing = useCallback(
    (
      web3: Web3,
      tokenId: number,
      from: string,
      price: string,
      startingTime: number,
      onTransactionHash: (hash: string) => void,
    ) => {
      const contract = new web3.eth.Contract(
        soundchainMarketplace.abi as AbiItem[],
        marketplaceAddress,
      ) as unknown as SoundchainMarketplace;
      const totalPrice = applySoundchainFee(parseInt(price));
      return beforeSending(
        web3,
        async () =>
          await contract.methods
            .updateListing(nftAddress, tokenId, totalPrice, startingTime)
            .send({ from, gas })
            .on('transactionHash', onTransactionHash),
      );
    },
    [beforeSending],
  );

  const buyItem = useCallback(
    (
      web3: Web3,
      tokenId: number,
      from: string,
      owner: string,
      value: string,
      onTransactionHash: (hash: string) => void,
    ) => {
      const contract = new web3.eth.Contract(
        soundchainMarketplace.abi as AbiItem[],
        marketplaceAddress,
      ) as unknown as SoundchainMarketplace;
      return beforeSending(
        web3,
        async () =>
          await contract.methods
            .buyItem(nftAddress, tokenId, owner)
            .send({ from, gas, value })
            .on('transactionHash', onTransactionHash),
      );
    },
    [beforeSending],
  );

  const transferNftToken = useCallback(
    (web3: Web3, tokenId: number, from: string, toAddress: string) => {
      const contract = new web3.eth.Contract(
        soundchainContract.abi as AbiItem[],
        nftAddress,
      ) as unknown as Soundchain721;
      return beforeSending(
        web3,
        async () => await contract.methods.transferFrom(from, toAddress, tokenId).send({ from, gas }),
      );
    },
    [beforeSending],
  );

  const sendMatic = useCallback(
    (web3: Web3, to: string, from: string, amount: string, onReceipt: (receipt: TransactionReceipt) => void) => {
      const amountWei = web3.utils.toWei(amount);
      beforeSending(web3, () =>
        web3.eth
          .sendTransaction({
            from: from,
            to: to,
            value: amountWei,
          })
          .on('receipt', onReceipt),
      );
    },
    [beforeSending],
  );

  const isTokenOwner = useCallback(async (web3: Web3, tokenId: number, from: string) => {
    const nftContract = new web3.eth.Contract(
      soundchainContract.abi as AbiItem[],
      nftAddress,
    ) as unknown as Soundchain721;
    const ownerOf = await nftContract.methods.ownerOf(tokenId).call();
    return compareWallets(ownerOf, from);
  }, []);

  const getRoyalties = useCallback(async (web3: Web3, tokenId: number) => {
    const nftContract = new web3.eth.Contract(
      soundchainContract.abi as AbiItem[],
      nftAddress,
    ) as unknown as Soundchain721;
    const royalties = await nftContract.methods.royaltyPercentage(tokenId).call();
    return parseFloat(royalties);
  }, []);

  const mintNftToken = useCallback(
    (
      web3: Web3,
      uri: string,
      from: string,
      toAddress: string,
      royaltyPercentage: number,
      onTransactionHash: (hash: string) => void,
      onError: (error: Error) => void,
    ) => {
      const contract = new web3.eth.Contract(
        soundchainContract.abi as AbiItem[],
        nftAddress,
      ) as unknown as Soundchain721;
      beforeSending(web3, () => {
        contract.methods
          .safeMint(toAddress, uri, royaltyPercentage)
          .send({ from, gas })
          .on('transactionHash', onTransactionHash)
          .on('error', onError);
      });
    },
    [beforeSending],
  );

  const isApprovedMarketplace = useCallback(async (web3: Web3, from: string) => {
    const nftContract = new web3.eth.Contract(
      soundchainContract.abi as AbiItem[],
      nftAddress,
    ) as unknown as Soundchain721;
    return await nftContract.methods.isApprovedForAll(from, marketplaceAddress).call();
  }, []);

  const isApprovedAuction = useCallback(async (web3: Web3, from: string) => {
    const nftContract = new web3.eth.Contract(
      soundchainContract.abi as AbiItem[],
      nftAddress,
    ) as unknown as Soundchain721;
    return await nftContract.methods.isApprovedForAll(from, auctionAddress).call();
  }, []);

  const createAuction = useCallback(
    (
      web3: Web3,
      tokenId: number,
      reservePrice: string,
      startTime: number,
      endTime: number,
      from: string,
      onReceipt: (receipt: TransactionReceipt) => void,
    ) => {
      const auctionContract = new web3.eth.Contract(
        soundchainAuction.abi as AbiItem[],
        auctionAddress,
      ) as unknown as SoundchainAuction;
      const totalPrice = applySoundchainFee(parseInt(reservePrice));
      console.log('createAuction totalPrice', totalPrice);
      beforeSending(web3, () => {
        auctionContract.methods
          .createAuction(nftAddress, tokenId, totalPrice, startTime, endTime)
          .send({ from, gas })
          .on('receipt', onReceipt);
      });
    },
    [beforeSending],
  );

  const cancelAuction = useCallback(
    (web3: Web3, tokenId: number, from: string, onReceipt: (receipt: TransactionReceipt) => void) => {
      const auctionContract = new web3.eth.Contract(
        soundchainAuction.abi as AbiItem[],
        auctionAddress,
      ) as unknown as SoundchainAuction;
      beforeSending(web3, () => {
        auctionContract.methods.cancelAuction(nftAddress, tokenId).send({ from, gas }).on('receipt', onReceipt);
      });
    },
    [beforeSending],
  );

  const resultAuction = useCallback(
    (web3: Web3, tokenId: number, from: string, onReceipt: (receipt: TransactionReceipt) => void) => {
      const auctionContract = new web3.eth.Contract(
        soundchainAuction.abi as AbiItem[],
        auctionAddress,
      ) as unknown as SoundchainAuction;
      beforeSending(web3, () => {
        auctionContract.methods.resultAuction(nftAddress, tokenId).send({ from, gas }).on('receipt', onReceipt);
      });
    },
    [beforeSending],
  );

  const updateAuction = useCallback(
    (
      web3: Web3,
      tokenId: number,
      from: string,
      reservePrice: string,
      startTime: number,
      endTime: number,
      onReceipt: (receipt: TransactionReceipt) => void,
    ) => {
      const auctionContract = new web3.eth.Contract(
        soundchainAuction.abi as AbiItem[],
        auctionAddress,
      ) as unknown as SoundchainAuction;
      const totalPrice = applySoundchainFee(parseInt(reservePrice));
      beforeSending(web3, () => {
        auctionContract.methods
          .updateAuction(nftAddress, tokenId, totalPrice, startTime, endTime)
          .send({ from, gas })
          .on('receipt', onReceipt);
      });
    },
    [beforeSending],
  );

  const getHighestBid = useCallback(async (web3: Web3, tokenId: number) => {
    const auctionContract = new web3.eth.Contract(
      soundchainAuction.abi as AbiItem[],
      auctionAddress,
    ) as unknown as SoundchainAuction;
    return await auctionContract.methods.getHighestBidder(nftAddress, tokenId).call();
  }, []);

  const getMaxGasFee = useCallback(async (web3: Web3) => {
    const gasPriceWei = await web3.eth.getGasPrice();
    const gasPrice = parseInt(web3.utils.fromWei(gasPriceWei, 'Gwei'));
    const maxFeeWei = gasPrice * gas;
    return web3.utils.fromWei(maxFeeWei.toString(), 'Gwei');
  }, []);

  const getCurrentGasPrice = useCallback(async (web3: Web3) => {
    const gasPriceWei = await web3.eth.getGasPrice();
    return web3.utils.fromWei(gasPriceWei, 'ether');
  }, []);

  return {
    approveAuction,
    approveMarketplace,
    burnNftToken,
    buyItem,
    cancelAuction,
    cancelListing,
    createAuction,
    getCurrentGasPrice,
    getHighestBid,
    getIpfsAssetUrl,
    getMaxGasFee,
    getRoyalties,
    isApprovedAuction,
    isApprovedMarketplace,
    isTokenOwner,
    listItem,
    mintNftToken,
    resultAuction,
    sendMatic,
    transferNftToken,
    updateAuction,
    updateListing,
  };
};

export default useBlockchain;
