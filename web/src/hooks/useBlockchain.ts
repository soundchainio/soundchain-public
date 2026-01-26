import { BATCH_SIZE } from 'components/modals/CreateModal'
import { config } from 'config'
import { useCallback } from 'react'
import { Soundchain721 } from 'types/web3-v1-contracts/Soundchain721'
import { Soundchain721Editions } from 'types/web3-v2-contracts/Soundchain721Editions'
import { SoundchainAuction as SoundchainAuctionV2 } from 'types/web3-v2-contracts/SoundchainAuction'
import { compareWallets } from 'utils/Wallet'
import Web3 from 'web3'
import { AbiItem } from 'web3-utils'
import soundchainContract from '../contract/Soundchain721.sol/Soundchain721.json'
import soundchainContractEditions from '../contract/Soundchain721Editions.sol/Soundchain721Editions.json'
import soundchainAuctionV2 from '../contract/v2/SoundchainAuction.json'
import { ContractAddresses, gasPriceMultiplier } from './useBlockchainV2'

const nftAddress = config.web3.contractsV2.contractAddress as string
const marketplaceEditionsAddress = config.web3.contractsV2.marketplaceAddress as string
const auctionV2Address = config.web3.contractsV2.auctionAddress as string

// Realistic gas costs for Polygon (much lower than Ethereum)
const createEditionGasCost = 65000      // Was 130000 - reduced for Polygon
const baseMintGasCost = 32000           // Was 63538 - reduced for Polygon
const mintUnitGasCost = 55000           // Was 117000 - reduced for Polygon
const listBatchUnitGasCost = 45000      // Was 98900 - reduced for Polygon
const cancelListBatchUnitGasCost = 25000 // Was 30800 - slightly reduced

export const gas = 1200000
export const applySoundchainFee = (price: number) => (price * (1 + config.soundchainFee)).toFixed()

const useBlockchain = () => {
  const getIpfsAssetUrl = useCallback((uri: string) => {
    const [protocol, urn] = uri.split('//')
    return protocol === 'ipfs:' ? config.ipfsGateway + urn : uri
  }, [])

  const isTokenOwner = useCallback(
    async (web3: Web3, tokenId: number, from: string, contractAddresses: ContractAddresses) => {
      const nftContract = new web3.eth.Contract(
        soundchainContract.abi as AbiItem[],
        contractAddresses.nft || nftAddress,
      ) as unknown as Soundchain721
      const ownerOf = await nftContract.methods.ownerOf(tokenId).call()
      return compareWallets(ownerOf, from)
    },
    [],
  )

  const isEditionOwner = useCallback(
    async (web3: Web3, editionNumber: number, from: string, contractAddresses: ContractAddresses) => {
      const nftContract = new web3.eth.Contract(
        soundchainContractEditions.abi as AbiItem[],
        contractAddresses.nft || nftAddress,
      ) as unknown as Soundchain721Editions
      const ownerOf = await (await nftContract.methods.editions(editionNumber).call()).owner
      return compareWallets(ownerOf, from)
    },
    [],
  )

  const getRoyalties = useCallback(async (web3: Web3, tokenId: number, contractAddresses: ContractAddresses) => {
    const nftContract = new web3.eth.Contract(
      soundchainContract.abi as AbiItem[],
      contractAddresses.nft || nftAddress,
    ) as unknown as Soundchain721
    const royalties = await nftContract.methods.royaltyPercentage(tokenId).call()
    return parseFloat(royalties)
  }, [])

  const isApprovedMarketplace = useCallback(async (web3: Web3, from: string, contractAddresses: ContractAddresses) => {
    const nftContract = new web3.eth.Contract(
      soundchainContract.abi as AbiItem[],
      contractAddresses.nft || nftAddress,
    ) as unknown as Soundchain721
    return await nftContract.methods.isApprovedForAll(from, marketplaceEditionsAddress).call()
  }, [])

  const isApprovedAuction = useCallback(async (web3: Web3, from: string, contractAddresses: ContractAddresses) => {
    const nftContract = new web3.eth.Contract(
      soundchainContract.abi as AbiItem[],
      contractAddresses.nft || nftAddress,
    ) as unknown as Soundchain721
    return await nftContract.methods.isApprovedForAll(from, auctionV2Address).call()
  }, [])

  const getHighestBid = useCallback(async (web3: Web3, tokenId: number, contractAddresses: ContractAddresses) => {
    const auctionContract = new web3.eth.Contract(
      soundchainAuctionV2.abi as AbiItem[],
      auctionV2Address,
    ) as unknown as SoundchainAuctionV2
    return await auctionContract.methods.getHighestBidder(contractAddresses.nft || nftAddress, tokenId).call()
  }, [])

  const getMaxGasFee = useCallback(async (web3: Web3) => {
    const gasPriceWei = await web3.eth.getGasPrice()
    const gasPrice = parseInt(web3.utils.fromWei(gasPriceWei, 'Gwei'))
    const maxFeeWei = gasPrice * gas
    return web3.utils.fromWei(maxFeeWei.toLocaleString('fullwide', { useGrouping: false }), 'Gwei')
  }, [])

  const getEstimatedMintFee = useCallback(async (web3: Web3, editionSize: number) => {
    const gasPriceWei = await web3.eth.getGasPrice()
    const gasPrice = parseInt(web3.utils.fromWei(gasPriceWei, 'Gwei'))

    let cost = createEditionGasCost

    let quantityLeft = editionSize
    for (let index = 0; index < editionSize; index += BATCH_SIZE) {
      const quantity = quantityLeft <= BATCH_SIZE ? quantityLeft : BATCH_SIZE
      cost += baseMintGasCost + quantity * mintUnitGasCost

      quantityLeft = quantityLeft - BATCH_SIZE
    }

    const maxFeeWei = gasPrice * gasPriceMultiplier * cost
    return web3.utils.fromWei(maxFeeWei.toLocaleString('fullwide', { useGrouping: false }), 'Gwei')
  }, [])

  const getEstimatedListFee = useCallback(async (web3: Web3, quantity: number) => {
    const gasPriceWei = await web3.eth.getGasPrice()
    const gasPrice = parseInt(web3.utils.fromWei(gasPriceWei, 'Gwei'))

    const maxFeeWei = gasPrice * gasPriceMultiplier * (listBatchUnitGasCost * quantity)
    return web3.utils.fromWei(maxFeeWei.toLocaleString('fullwide', { useGrouping: false }), 'Gwei')
  }, [])

  const getEstimatedCancelListFee = useCallback(async (web3: Web3, quantity: number) => {
    const gasPriceWei = await web3.eth.getGasPrice()
    const gasPrice = parseInt(web3.utils.fromWei(gasPriceWei, 'Gwei'))

    const maxFeeWei = gasPrice * gasPriceMultiplier * (cancelListBatchUnitGasCost * quantity)
    return web3.utils.fromWei(maxFeeWei.toLocaleString('fullwide', { useGrouping: false }), 'Gwei')
  }, [])

  const getCurrentGasPrice = useCallback(async (web3: Web3) => {
    const gasPriceWei = await web3.eth.getGasPrice()
    return web3.utils.fromWei(gasPriceWei, 'ether')
  }, [])

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
  }
}

export default useBlockchain
