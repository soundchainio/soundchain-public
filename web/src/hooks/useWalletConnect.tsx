import { useCallback, useState } from 'react'
import Web3 from 'web3'

/**
 * @deprecated WalletConnect v1 bridge is shut down. Use Reown AppKit (Web3Modal) instead.
 * This hook is kept for backwards compatibility but will always throw on connect().
 */
export const useWalletConnect = () => {
  const [web3, setWeb3] = useState<Web3>()
  const [account, setAccount] = useState<string>()

  const connect = useCallback(async () => {
    throw new Error('WalletConnect v1 is no longer supported. Use Reown AppKit via the CONNECT button.')
  }, [])

  const disconnect = useCallback(async () => {
    setAccount(undefined)
    setWeb3(undefined)
  }, [])

  return { web3, connect, disconnect, provider: null, account }
}

export default useWalletConnect
