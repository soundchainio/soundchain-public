import { useEffect, useState } from 'react'
import useBlockchain from './useBlockchain'
import { useWalletContext } from './useWalletContext'

export const useMaxMintGasFee = (editionSize: number, fetch = true) => {
  const { web3 } = useWalletContext()
  const { getEstimatedMintFee } = useBlockchain()
  const [maxGasFee, setMaxGasFee] = useState<string>()

  useEffect(() => {
    if (!fetch) return
    const gasCheck = async () => {
      if (!web3 || !getEstimatedMintFee) return
      const maxFee = await getEstimatedMintFee(web3, editionSize)
      setMaxGasFee(maxFee)
    }
    gasCheck()
  }, [web3, getEstimatedMintFee, editionSize, fetch])

  return maxGasFee
}
