import { useEffect, useState, useMemo } from 'react'
import Web3 from 'web3'
import useBlockchain from './useBlockchain'
import { useWalletContext } from './useWalletContext'
import { mainNetwork } from '../lib/blockchainNetworks'

// Fallback Web3 instance using public RPC for gas estimation when no wallet is connected
const createFallbackWeb3 = () => {
  try {
    return new Web3(mainNetwork.rpc)
  } catch {
    return null
  }
}

export const useMaxMintGasFee = (editionSize: number, fetch = true) => {
  const { web3: walletWeb3 } = useWalletContext()
  const { getEstimatedMintFee } = useBlockchain()
  const [maxGasFee, setMaxGasFee] = useState<string>()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Use wallet web3 if available, otherwise use fallback public RPC
  const fallbackWeb3 = useMemo(() => createFallbackWeb3(), [])
  const web3 = walletWeb3 || fallbackWeb3

  useEffect(() => {
    if (!fetch) return
    if (!web3 || !getEstimatedMintFee) return

    const gasCheck = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const maxFee = await getEstimatedMintFee(web3, editionSize)
        setMaxGasFee(maxFee)
      } catch (err) {
        console.error('[useMaxMintGasFee] Gas estimation failed:', err)
        setError('Failed to estimate gas')
        // Set a reasonable fallback estimate based on typical Polygon gas prices
        // ~65,000 gas for createEdition + ~55,000 per NFT, at ~30 gwei
        const fallbackGas = (65000 + editionSize * 55000) * 30 * 1.2 // 1.2x buffer
        const fallbackPol = fallbackGas / 1e9 // Convert gwei to POL
        setMaxGasFee(fallbackPol.toFixed(6))
      } finally {
        setIsLoading(false)
      }
    }
    gasCheck()
  }, [web3, getEstimatedMintFee, editionSize, fetch])

  return maxGasFee
}
