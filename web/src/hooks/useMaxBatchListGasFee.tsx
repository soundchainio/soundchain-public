import { useEffect, useState, useMemo } from 'react'
import Web3 from 'web3'
import useBlockchain from './useBlockchain'
import { useWalletContext } from './useWalletContext'
import { mainNetwork } from '../lib/blockchainNetworks'

// Fallback Web3 instance using public RPC for gas estimation
const createFallbackWeb3 = () => {
  try {
    return new Web3(mainNetwork.rpc)
  } catch {
    return null
  }
}

export const useMaxBatchListGasFee = (quantity: number, fetch = true) => {
  const { web3: walletWeb3 } = useWalletContext()
  const { getEstimatedListFee } = useBlockchain()
  const [maxGasFee, setMaxGasFee] = useState<string>()

  // Use wallet web3 if available, otherwise use fallback public RPC
  const fallbackWeb3 = useMemo(() => createFallbackWeb3(), [])
  const web3 = walletWeb3 || fallbackWeb3

  useEffect(() => {
    if (!fetch) return
    if (!web3 || !getEstimatedListFee || !quantity) return

    const gasCheck = async () => {
      try {
        const maxFee = await getEstimatedListFee(web3, quantity)
        setMaxGasFee(maxFee)
      } catch (err) {
        console.error('[useMaxBatchListGasFee] Gas estimation failed:', err)
        // Set a fallback estimate (~100000 gas per listing at ~30 gwei)
        const fallbackGas = quantity * 100000 * 30 * 1.2
        const fallbackPol = fallbackGas / 1e9
        setMaxGasFee(fallbackPol.toFixed(6))
      }
    }
    gasCheck()
  }, [web3, getEstimatedListFee, quantity, fetch])

  return maxGasFee
}
