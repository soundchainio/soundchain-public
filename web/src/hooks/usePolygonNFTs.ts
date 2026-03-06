/**
 * Polygon NFT Fetcher Hook
 * Fetches SoundChain NFTs from Polygon for legacy users (2022-2024)
 * Works with any connected wallet address (MetaMask, Magic, etc.)
 */

import { useState, useEffect, useCallback } from 'react'
import Web3 from 'web3'
import { AbiItem } from 'web3-utils'
import { CHAINS } from '../constants/chains'
import { config } from '../config'

// ERC-721 ABI for NFT queries
const ERC721_ABI: AbiItem[] = [
  {
    inputs: [{ name: 'owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'owner', type: 'address' }, { name: 'index', type: 'uint256' }],
    name: 'tokenOfOwnerByIndex',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'tokenURI',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'ownerOf',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
]

export interface PolygonNFT {
  tokenId: string
  contractAddress: string
  name?: string
  description?: string
  image?: string
  audioUrl?: string
  animationUrl?: string
  artist?: string
  attributes?: Array<{ trait_type: string; value: string }>
  chainId: string
  chainName: string
}

export interface PolygonNFTResult {
  nfts: PolygonNFT[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

// SoundChain NFT contract address on Polygon
const SOUNDCHAIN_NFT_CONTRACT = config.web3?.contractsV2?.contractAddress

// Convert IPFS URLs to HTTP gateway
const ipfsToHttp = (url?: string): string | undefined => {
  if (!url) return undefined
  if (url.startsWith('ipfs://')) {
    const hash = url.replace('ipfs://', '')
    return `https://soundchain.mypinata.cloud/ipfs/${hash}`
  }
  if (url.startsWith('ar://')) {
    return `https://arweave.net/${url.replace('ar://', '')}`
  }
  return url
}

// Fetch NFT metadata from tokenURI
const fetchNFTMetadata = async (tokenURI: string): Promise<any> => {
  try {
    const url = ipfsToHttp(tokenURI)
    if (!url) return {}

    const response = await fetch(url)
    if (!response.ok) return {}

    return await response.json()
  } catch {
    return {}
  }
}

export function usePolygonNFTs(address: string | undefined): PolygonNFTResult {
  const [nfts, setNfts] = useState<PolygonNFT[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchNFTs = useCallback(async () => {
    if (!address || !SOUNDCHAIN_NFT_CONTRACT) {
      setNfts([])
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const chain = CHAINS.polygon
      if (!chain?.rpcUrl) {
        throw new Error('Polygon RPC not available')
      }

      const web3 = new Web3(chain.rpcUrl)
      const contract = new web3.eth.Contract(ERC721_ABI, SOUNDCHAIN_NFT_CONTRACT)

      // Get balance (number of NFTs owned)
      const balance = await contract.methods.balanceOf(address).call()
      const nftCount = typeof balance === 'bigint' ? Number(balance) : parseInt(balance as string, 10)

      console.log(`🎵 Found ${nftCount} SoundChain NFTs for ${address.slice(0, 6)}...`)

      if (nftCount === 0) {
        setNfts([])
        setIsLoading(false)
        return
      }

      // Fetch token IDs and metadata (limit to first 50 for performance)
      const maxToFetch = Math.min(nftCount, 50)
      const nftPromises: Promise<PolygonNFT | null>[] = []

      for (let i = 0; i < maxToFetch; i++) {
        nftPromises.push(
          (async () => {
            try {
              // Get token ID at index
              const tokenId = await contract.methods.tokenOfOwnerByIndex(address, i).call()
              const tokenIdStr = typeof tokenId === 'bigint' ? tokenId.toString() : String(tokenId)

              // Get token URI
              const tokenURI = await contract.methods.tokenURI(tokenIdStr).call()

              // Fetch metadata
              const metadata = await fetchNFTMetadata(tokenURI as string)

              return {
                tokenId: tokenIdStr,
                contractAddress: SOUNDCHAIN_NFT_CONTRACT,
                name: metadata.name || `SoundChain #${tokenIdStr}`,
                description: metadata.description,
                image: ipfsToHttp(metadata.image),
                audioUrl: ipfsToHttp(metadata.animation_url || metadata.audio),
                animationUrl: ipfsToHttp(metadata.animation_url),
                artist: metadata.artist || metadata.properties?.artist,
                attributes: metadata.attributes,
                chainId: 'polygon',
                chainName: 'Polygon',
              }
            } catch (err) {
              console.error(`Error fetching NFT at index ${i}:`, err)
              return null
            }
          })()
        )
      }

      const results = await Promise.all(nftPromises)
      const validNfts = results.filter((nft): nft is PolygonNFT => nft !== null)

      console.log(`🎵 Loaded ${validNfts.length} NFT metadata`)
      setNfts(validNfts)
    } catch (err: any) {
      console.error('Error fetching Polygon NFTs:', err)
      setError(err.message || 'Failed to fetch NFTs')
      setNfts([])
    } finally {
      setIsLoading(false)
    }
  }, [address])

  // Fetch on mount and address change
  useEffect(() => {
    fetchNFTs()
  }, [fetchNFTs])

  return {
    nfts,
    isLoading,
    error,
    refetch: fetchNFTs,
  }
}

// Fetch NFTs from any ERC-721 contract on Polygon
export function usePolygonContractNFTs(
  address: string | undefined,
  contractAddress: string | undefined
): PolygonNFTResult {
  const [nfts, setNfts] = useState<PolygonNFT[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchNFTs = useCallback(async () => {
    if (!address || !contractAddress) {
      setNfts([])
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const chain = CHAINS.polygon
      if (!chain?.rpcUrl) {
        throw new Error('Polygon RPC not available')
      }

      const web3 = new Web3(chain.rpcUrl)
      const contract = new web3.eth.Contract(ERC721_ABI, contractAddress)

      // Get balance
      const balance = await contract.methods.balanceOf(address).call()
      const nftCount = typeof balance === 'bigint' ? Number(balance) : parseInt(balance as string, 10)

      if (nftCount === 0) {
        setNfts([])
        setIsLoading(false)
        return
      }

      // Fetch first 20 NFTs
      const maxToFetch = Math.min(nftCount, 20)
      const nftPromises: Promise<PolygonNFT | null>[] = []

      for (let i = 0; i < maxToFetch; i++) {
        nftPromises.push(
          (async () => {
            try {
              const tokenId = await contract.methods.tokenOfOwnerByIndex(address, i).call()
              const tokenIdStr = typeof tokenId === 'bigint' ? tokenId.toString() : String(tokenId)
              const tokenURI = await contract.methods.tokenURI(tokenIdStr).call()
              const metadata = await fetchNFTMetadata(tokenURI as string)

              return {
                tokenId: tokenIdStr,
                contractAddress,
                name: metadata.name || `NFT #${tokenIdStr}`,
                description: metadata.description,
                image: ipfsToHttp(metadata.image),
                audioUrl: ipfsToHttp(metadata.animation_url),
                animationUrl: ipfsToHttp(metadata.animation_url),
                artist: metadata.artist,
                attributes: metadata.attributes,
                chainId: 'polygon',
                chainName: 'Polygon',
              }
            } catch {
              return null
            }
          })()
        )
      }

      const results = await Promise.all(nftPromises)
      setNfts(results.filter((nft): nft is PolygonNFT => nft !== null))
    } catch (err: any) {
      setError(err.message)
      setNfts([])
    } finally {
      setIsLoading(false)
    }
  }, [address, contractAddress])

  useEffect(() => {
    fetchNFTs()
  }, [fetchNFTs])

  return { nfts, isLoading, error, refetch: fetchNFTs }
}

export default usePolygonNFTs
