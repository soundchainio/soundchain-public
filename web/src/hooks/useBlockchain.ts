import { BATCH_SIZE } from 'components/modals/CreateModal';
import { config } from 'config';
import { useCallback } from 'react';
import { Soundchain721 } from 'types/web3-v1-contracts/Soundchain721';
import { SoundchainAuction } from 'types/web3-v1-contracts/SoundchainAuction';
import { Soundchain721Editions } from 'types/web3-v2-contracts/Soundchain721Editions';
import { compareWallets } from 'utils/Wallet';
import Web3 from 'web3';
import { AbiItem } from 'web3-utils';
import soundchainAuction from '../contract/Auction.sol/SoundchainAuction.json';
import soundchainContract from '../contract/Soundchain721.sol/Soundchain721.json';
import soundchainContractEditions from '../contract/Soundchain721Editions.sol/Soundchain721Editions.json';
import { ContractAddresses, gasPriceMultiplier } from './useBlockchainV2';

const nftAddress = config.web3.contractsV2.contractAddress as string;
const marketplaceEditionsAddress = config.web3.contractsV2.marketplaceAddress as string;
const auctionAddress = config.web3.contractsV1.auctionAddress as string;

const createEditionGasCost = 130000
const baseMintGasCost = 63538
const mintUnitGasCost = 117000
const listBatchUnitGasCost = 98900
const cancelListBatchUnitGasCost = 30800

export const gas = 1200000;
export const applySoundchainFee = (price: number) => (price * (1 + config.soundchainFee)).toFixed();

const useBlockchain = () => {
  const getIpfsAssetUrl = useCallback((uri: string) => {
    const [protocol, urn] = uri.split('//');
    return protocol === 'ipfs:' ? config.ipfsGateway + urn : uri;
  }, []);

  const isTokenOwner = useCallback(async (web3: Web3, tokenId: number, from: string, contractAddresses: ContractAddresses) => {
    const nftContract = new web3.eth.Contract(
      soundchainContract.abi as AbiItem[],
      contractAddresses.nft || nftAddress,
    ) as unknown as Soundchain721;
    const ownerOf = await nftContract.methods.ownerOf(tokenId).call();
    return compareWallets(ownerOf, from);
  }, []);

  const isEditionOwner = useCallback(async (web3: Web3, editionNumber: number, from: string, contractAddresses: ContractAddresses) => {
    const nftContract = new web3.eth.Contract(
      soundchainContractEditions.abi as AbiItem[],
      contractAddresses.nft || nftAddress,
    ) as unknown as Soundchain721Editions;
    const ownerOf = await (await nftContract.methods.editions(editionNumber).call()).owner;
    return compareWallets(ownerOf, from);
  }, []);

  const getRoyalties = useCallback(async (web3: Web3, tokenId: number, contractAddresses: ContractAddresses) => {
    const nftContract = new web3.eth.Contract(
      soundchainContract.abi as AbiItem[],
      contractAddresses.nft || nftAddress,
    ) as unknown as Soundchain721;
    const royalties = await nftContract.methods.royaltyPercentage(tokenId).call();
    return parseFloat(royalties);
  }, []);

  const isApprovedMarketplace = useCallback(async (web3: Web3, from: string, contractAddresses: ContractAddresses) => {
    const nftContract = new web3.eth.Contract(
      soundchainContract.abi as AbiItem[],
      contractAddresses.nft || nftAddress,
    ) as unknown as Soundchain721;
    return await nftContract.methods.isApprovedForAll(from, marketplaceEditionsAddress).call();
  }, []);

  const isApprovedAuction = useCallback(async (web3: Web3, from: string, contractAddresses: ContractAddresses) => {
    const nftContract = new web3.eth.Contract(
      soundchainContract.abi as AbiItem[],
      contractAddresses.nft || nftAddress,
    ) as unknown as Soundchain721;
    return await nftContract.methods.isApprovedForAll(from, auctionAddress).call();
  }, []);

  const getHighestBid = useCallback(async (web3: Web3, tokenId: number, contractAddresses: ContractAddresses) => {
    const auctionContract = new web3.eth.Contract(
      soundchainAuction.abi as AbiItem[],
      auctionAddress,
    ) as unknown as SoundchainAuction;
    return await auctionContract.methods.getHighestBidder(contractAddresses.nft || nftAddress, tokenId).call();
  }, []);

  const getMaxGasFee = useCallback(async (web3: Web3) => {
    const gasPriceWei = await web3.eth.getGasPrice();
    const gasPrice = parseInt(web3.utils.fromWei(gasPriceWei, 'Gwei'));
    const maxFeeWei = gasPrice * gas;
    return web3.utils.fromWei(maxFeeWei.toLocaleString('fullwide', { useGrouping: false }), 'Gwei');
  }, []);

  const getEstimatedMintFee = useCallback(async (web3: Web3, editionSize: number) => {
    const gasPriceWei = await web3.eth.getGasPrice();
    const gasPrice = parseInt(web3.utils.fromWei(gasPriceWei, 'Gwei'));

    let cost = createEditionGasCost;

    let quantityLeft = editionSize;
    for (let index = 0; index < editionSize; index += BATCH_SIZE) {
      const quantity = quantityLeft <= BATCH_SIZE ? quantityLeft : BATCH_SIZE;
      cost += baseMintGasCost + (quantity * mintUnitGasCost);
      
      quantityLeft = quantityLeft - BATCH_SIZE;
    }

    const maxFeeWei = (gasPrice * gasPriceMultiplier) * cost;
    return web3.utils.fromWei(maxFeeWei.toLocaleString('fullwide', { useGrouping: false }), 'Gwei');
  }, []);

  const getEstimatedListFee = useCallback(async (web3: Web3, quantity: number) => {
    const gasPriceWei = await web3.eth.getGasPrice();
    const gasPrice = parseInt(web3.utils.fromWei(gasPriceWei, 'Gwei'));

    const maxFeeWei = (gasPrice * gasPriceMultiplier) * (listBatchUnitGasCost * quantity);
    return web3.utils.fromWei(maxFeeWei.toLocaleString('fullwide', { useGrouping: false }), 'Gwei');
  }, []);

  const getEstimatedCancelListFee = useCallback(async (web3: Web3, quantity: number) => {
    const gasPriceWei = await web3.eth.getGasPrice();
    const gasPrice = parseInt(web3.utils.fromWei(gasPriceWei, 'Gwei'));

    const maxFeeWei = (gasPrice * gasPriceMultiplier) * (cancelListBatchUnitGasCost * quantity);
    return web3.utils.fromWei(maxFeeWei.toLocaleString('fullwide', { useGrouping: false }), 'Gwei');
  }, []);

  const getCurrentGasPrice = useCallback(async (web3: Web3) => {
    const gasPriceWei = await web3.eth.getGasPrice();
    return web3.utils.fromWei(gasPriceWei, 'ether');
  }, []);

  return {
    getCurrentGasPrice,
    getHighestBid,
    getIpfsAssetUrl,
    getMaxGasFee,
    getEstimatedMintFee,
    getEstimatedListFee,
    getEstimatedCancelListFee,
    getRoyalties,
    isApprovedAuction,
    isApprovedMarketplace,
    isTokenOwner,
    isEditionOwner,
  };
};

export default useBlockchain;