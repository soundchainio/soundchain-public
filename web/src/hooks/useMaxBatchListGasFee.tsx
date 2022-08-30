import { useEffect, useState } from 'react'
import useBlockchain from './useBlockchain'
import { useWalletContext } from './useWalletContext'

export const useMaxBatchListGasFee = (quantity: number, fetch = true) => {
  const { web3 } = useWalletContext()
  const { getEstimatedListFee } = useBlockchain()
  const [maxGasFee, setMaxGasFee] = useState<string>()

  useEffect(() => {
    if (!fetch) return
    const gasCheck = async () => {
      if (!web3 || !getEstimatedListFee || !quantity) return
      const maxFee = await getEstimatedListFee(web3, quantity)
      setMaxGasFee(maxFee)
    }
    gasCheck()
  }, [web3, getEstimatedListFee, quantity, fetch])

  return maxGasFee
}
