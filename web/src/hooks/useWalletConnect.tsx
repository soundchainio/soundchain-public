import WalletConnectProvider from '@walletconnect/web3-provider'
import { mainNetwork, testnetNetwork } from 'lib/blockchainNetworks'
import { useEffect, useState } from 'react'
import Web3 from 'web3'
// type IWeb3Provider = typeof IWeb3Provider;

export const useWalletConnect = () => {
  const [provider, setProvider] = useState<WalletConnectProvider>()
  const [web3, setWeb3] = useState<Web3>()
  const [account, setAccount] = useState<string>()

  useEffect(() => {
    if (!provider) {
      //  Create WalletConnect Provider
      const walletProvider = new WalletConnectProvider({
        rpc: {
          137: mainNetwork.rpc,
          80002: testnetNetwork.rpc,
          8453: 'https://mainnet.base.org',     // Base (Coinbase L2)
          1: 'https://eth.llamarpc.com',        // Ethereum mainnet
          42161: 'https://arb1.arbitrum.io/rpc', // Arbitrum
          10: 'https://mainnet.optimism.io',    // Optimism
        },
      })
      walletProvider.updateRpcUrl(137)
      setProvider(walletProvider)
    }
    if (provider) {
      provider.on('accountsChanged', (accounts: string[]) => {
        setAccount(accounts[0])
      })
      provider.on('disconnect', (code: number, reason: string) => {
        console.log('disconnect: ', code, reason)
      })
    }
  }, [provider])

  const connect = async () => {
    if (provider) {
      //  Enable session (triggers QR Code modal)
      await provider.enable()
      provider.updateRpcUrl(137)

      //  eslint-disable-next-line @typescript-eslint/no-explicit-any
      const newWeb3 = new Web3(provider as any)
      setWeb3(newWeb3)

      const accounts = await newWeb3.eth.getAccounts()
      setAccount(accounts[0])
    }
  }

  const disconnect = async () => {
    if (provider) await provider.disconnect()
  }

  return { web3, connect, disconnect, provider, account }
}

export default useWalletConnect
