import { Button } from 'components/common/Buttons/Button'
import { network } from 'lib/blockchainNetworks'
import { DefaultWallet, useUpdateDefaultWalletMutation } from 'lib/graphql'
import React, { createContext, ReactNode, useContext } from 'react'
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

  return (
    <WalletContext.Provider value={context}>
      {children}
    </WalletContext.Provider>
  )
}

export const useWalletContext = () => useContext(WalletContext)

export default WalletProvider
