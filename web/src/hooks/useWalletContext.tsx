import { network } from 'lib/blockchainNetworks'
import { DefaultWallet, useUpdateDefaultWalletMutation } from 'lib/graphql'
import React, { createContext, ReactNode, useContext, useMemo } from 'react'
import Web3 from 'web3'
import { useMagicContext } from './useMagicContext'
import { useMe } from './useMe'
import useMetaMask from './useMetaMask'
import { useUnifiedWallet } from '../contexts/UnifiedWalletContext'

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

  const {
    activeWalletType,
    activeAddress,
    activeBalance,
    activeOgunBalance,
    refetchBalance: unifiedRefetch,
  } = useUnifiedWallet()

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

  // External wallets (Coinbase, WalletConnect, Phantom, etc.) via UnifiedWalletContext
  // If no context was set above AND unified wallet has an active external connection, use it
  if (!context.account && activeWalletType && activeWalletType !== 'magic' && activeAddress) {
    context = {
      account: activeAddress,
      balance: activeBalance || undefined,
      OGUNBalance: activeOgunBalance || undefined,
      web3: externalWeb3 || web3 || magicWeb3, // Prefer injected provider, fallback to MetaMask or Magic for read-only
      refetchBalance: unifiedRefetch,
    }
  }

  // Final fallback: if defaultWallet is Soundchain but magicAccount isn't loaded yet,
  // and unified context has an active external wallet selected, prefer the external wallet
  if (context.account === magicAccount && activeWalletType && activeWalletType !== 'magic' && activeAddress) {
    context = {
      account: activeAddress,
      balance: activeBalance || undefined,
      OGUNBalance: activeOgunBalance || undefined,
      web3: externalWeb3 || web3 || magicWeb3,
      refetchBalance: unifiedRefetch,
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
