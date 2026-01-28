import { network } from 'lib/blockchainNetworks'
import { DefaultWallet, useUpdateDefaultWalletMutation } from 'lib/graphql'
import React, { createContext, ReactNode, useContext, useMemo, useState, useEffect } from 'react'
import Web3 from 'web3'
import { useMagicContext } from './useMagicContext'
import { useMe } from './useMe'
import useMetaMask from './useMetaMask'

interface WalletContextData {
  web3?: Web3 | null
  account?: string
  balance?: string
  OGUNBalance?: string
  refetchBalance?: () => void
}

const WalletContext = createContext<WalletContextData>({})

interface WalletProviderProps {
  children?: ReactNode | undefined
}

const WalletProvider = ({ children }: WalletProviderProps) => {
  const me = useMe()
  const [updateDefaultWallet] = useUpdateDefaultWalletMutation()

  const { account, balance, chainId, addMumbaiTestnet, connect, web3, refetchBalance, loading } = useMetaMask()
  const {
    account: magicAccount,
    balance: magicBalance,
    ogunBalance: magicOgunBalance,
    web3: magicWeb3,
    refetchBalance: magicRefetchBalance,
  } = useMagicContext()

  // Read external wallet selection from localStorage (set by WalletSelector)
  const [externalWallet, setExternalWallet] = useState<{ address: string; type: string } | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const selectedType = localStorage.getItem('soundchain_selected_wallet')
    if (selectedType && selectedType !== 'soundchain' && selectedType !== 'metamask') {
      try {
        const saved = localStorage.getItem('soundchain_external_wallets')
        if (saved) {
          const wallets = JSON.parse(saved)
          const match = wallets.find((w: any) => w.walletType === selectedType)
          if (match) {
            setExternalWallet({ address: match.address, type: match.walletType })
          }
        }
      } catch {}
    } else {
      setExternalWallet(null)
    }
    // Listen for storage changes from WalletSelector
    const handler = () => {
      const type = localStorage.getItem('soundchain_selected_wallet')
      if (type && type !== 'soundchain' && type !== 'metamask') {
        try {
          const saved = localStorage.getItem('soundchain_external_wallets')
          if (saved) {
            const wallets = JSON.parse(saved)
            const match = wallets.find((w: any) => w.walletType === type)
            if (match) {
              setExternalWallet({ address: match.address, type: match.walletType })
              return
            }
          }
        } catch {}
      }
      setExternalWallet(null)
    }
    window.addEventListener('storage', handler)
    // Also poll briefly for same-tab updates
    const interval = setInterval(handler, 2000)
    return () => {
      window.removeEventListener('storage', handler)
      clearInterval(interval)
    }
  }, [])

  // Create Web3 instance from window.ethereum for external wallets
  const externalWeb3 = useMemo(() => {
    if (typeof window !== 'undefined' && window.ethereum) {
      try {
        return new Web3(window.ethereum as any)
      } catch {
        return null
      }
    }
    return null
  }, [])

  let context: WalletContextData = {}

  if (me?.defaultWallet === DefaultWallet.Soundchain) {
    context = {
      account: magicAccount,
      balance: magicBalance,
      OGUNBalance: magicOgunBalance,
      web3: magicWeb3,
      refetchBalance: magicRefetchBalance,
    }
  }

  // MetaMask wallet - no longer blocks UI for wrong network (multi-chain era)
  if (!loading && me?.defaultWallet === DefaultWallet.MetaMask) {
    if (account) {
      context = {
        account,
        balance,
        web3,
        refetchBalance,
      }
    }
    // Log network mismatch instead of blocking UI
    if (account && chainId && chainId !== network.id) {
      console.log(`⚠️ MetaMask on chain ${chainId}, expected ${network.id}. OGUN features require Polygon.`)
    }
  }

  // External wallets (Coinbase, WalletConnect, Phantom) via localStorage selection
  if (externalWallet && externalWallet.address) {
    context = {
      account: externalWallet.address,
      web3: externalWeb3 || web3 || magicWeb3,
      refetchBalance: refetchBalance || magicRefetchBalance,
    }
  }

  return (
    <WalletContext.Provider value={context}>
      {children}
    </WalletContext.Provider>
  )
}

export const useWalletContext = () => useContext(WalletContext)

export default WalletProvider
