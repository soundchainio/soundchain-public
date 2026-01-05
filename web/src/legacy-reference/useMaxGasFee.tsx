import { useEffect, useState } from 'react'
import useBlockchain from './useBlockchain'
import { useWalletContext } from './useWalletContext'

export const useMaxGasFee = (fetch = true) => {
  const { web3 } = useWalletContext()
  const { getMaxGasFee } = useBlockchain()
  const [maxGasFee, setMaxGasFee] = useState<string>()

  useEffect(() => {
    if (!fetch) return
    const gasCheck = async () => {
      if (!web3 || !getMaxGasFee) return
      const maxFee = await getMaxGasFee(web3)
      setMaxGasFee(maxFee)
    }
    gasCheck()
  }, [web3, getMaxGasFee, fetch])

  return maxGasFee
}
