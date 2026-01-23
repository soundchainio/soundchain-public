import { mainNetwork, testnetNetwork } from 'lib/blockchainNetworks'
import { useCallback, useRef, useState } from 'react'
import Web3 from 'web3'

// WalletConnect v1 has been deprecated and the bridge servers are shut down.
// This hook now uses lazy initialization and will warn users to use Web3Modal instead.
// TODO: Migrate to WalletConnect v2 or use Web3Modal exclusively

export const useWalletConnect = () => {
  const [web3, setWeb3] = useState<Web3>()
  const [account, setAccount] = useState<string>()
  const providerRef = useRef<any>(null)

  // Lazy initialization - only create provider when connect() is called
  const connect = useCallback(async () => {
    console.warn('⚠️ WalletConnect v1 is deprecated. Please use Web3Modal or MetaMask instead.')

    try {
      // Dynamically import to avoid initialization on page load
      const WalletConnectProvider = (await import('@walletconnect/web3-provider')).default

      const walletProvider = new WalletConnectProvider({
        rpc: {
          137: mainNetwork.rpc,
          80002: testnetNetwork.rpc,
          8453: 'https://mainnet.base.org',
          1: 'https://eth.llamarpc.com',
          42161: 'https://arb1.arbitrum.io/rpc',
          10: 'https://mainnet.optimism.io',
        },
      })

      walletProvider.updateRpcUrl(137)
      providerRef.current = walletProvider

      // Set up event listeners
      walletProvider.on('accountsChanged', (accounts: string[]) => {
        setAccount(accounts[0])
      })
      walletProvider.on('disconnect', (code: number, reason: string) => {
        console.log('WalletConnect disconnect:', code, reason)
        setAccount(undefined)
        setWeb3(undefined)
      })

      // Enable session (triggers QR Code modal)
      await walletProvider.enable()
      walletProvider.updateRpcUrl(137)

      const newWeb3 = new Web3(walletProvider as any)
      setWeb3(newWeb3)

      const accounts = await newWeb3.eth.getAccounts()
      setAccount(accounts[0])
    } catch (error: any) {
      // WalletConnect v1 bridge is dead - log error but don't crash
      console.error('WalletConnect v1 connection failed (bridge is deprecated):', error.message)
      throw new Error('WalletConnect v1 is no longer supported. Please use MetaMask or another wallet.')
    }
  }, [])

  const disconnect = useCallback(async () => {
    if (providerRef.current) {
      await providerRef.current.disconnect()
      providerRef.current = null
    }
    setAccount(undefined)
    setWeb3(undefined)
  }, [])

  return { web3, connect, disconnect, provider: providerRef.current, account }
}

export default useWalletConnect
