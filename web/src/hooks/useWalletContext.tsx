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

  let Content

  if (!loading && me?.defaultWallet === DefaultWallet.MetaMask) {
    if (!account) {
      Content = (
        <>
          <div>Oops! It seems you may not be connected to MetaMask</div>
          <Button variant="rainbow-xs" className="max-w-xs" onClick={() => connect()}>
            Connect to MetaMask Wallet
          </Button>
        </>
      )
    } else if (chainId !== network.id) {
      Content = (
        <>
          <div>Oops! It seems you may be connected to another network</div>
          <Button variant="rainbow-xs" onClick={() => addMumbaiTestnet()}>
            Connect to Mumbai Testnet
          </Button>
        </>
      )
    }

    context = {
      account,
      balance,
      web3,
      refetchBalance,
    }
  }

  return (
    <WalletContext.Provider value={context}>
      {children}
      {Content && (
        <div className="fixed top-0 left-0 z-50 flex h-full w-full flex-col items-center justify-center gap-4 bg-gray-30 bg-opacity-95 text-center font-bold text-white">
          {Content}
          <div>or you can select your SoundChain Wallet</div>
          <Button
            variant="rainbow-xs"
            onClick={() => {
              updateDefaultWallet({
                variables: {
                  input: {
                    defaultWallet: DefaultWallet.Soundchain,
                  },
                },
              })
            }}
          >
            Select SoundChain Wallet
          </Button>
        </div>
      )}
    </WalletContext.Provider>
  )
}

export const useWalletContext = () => useContext(WalletContext)

export default WalletProvider
