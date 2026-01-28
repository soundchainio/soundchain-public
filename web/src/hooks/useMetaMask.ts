import MetaMaskOnboarding from '@metamask/onboarding'
import { network } from 'lib/blockchainNetworks'
// import { useUpdateMetaMaskAddressesMutation } from 'lib/graphql-hooks'  // BYPASSED
import { useEffect, useRef, useState } from 'react'
import Web3 from 'web3'
import { useMe } from './useMe'
import { AbiItem } from 'web3-utils'
import { Contract } from 'web3-eth-contract'
import { config } from 'config'
import SoundchainOGUN20 from '../contract/SoundchainOGUN20.sol/SoundchainOGUN20.json'

const tokenContract = (web3: Web3): Contract<AbiItem[]> => {
  return new web3.eth.Contract(SoundchainOGUN20.abi as AbiItem[], config.ogunTokenAddress as string)
}

export const useMetaMask = () => {
  const me = useMe()
  // BYPASS mutation hook - webpack issue
  // const [updateWallet] = useUpdateMetaMaskAddressesMutation()
  const updateWallet = async () => {
    console.log('updateWallet disabled - webpack issue')
  }
  
  const [web3, setWeb3] = useState<Web3>()
  const [loadingAccount, setLoadingAccount] = useState<boolean>(true)
  const [account, setAccount] = useState<string>()
  const [balance, setBalance] = useState<string>()
  const [OGUNBalance, setOGUNBalance] = useState<string>()
  const [chainId, setChainId] = useState<number>()
  const [isRefetchingBalance, setIsRefetchingBalance] = useState<boolean>(false)
  const [loadingChain, setLoadingChain] = useState<boolean>(true)
  const onboarding = useRef<MetaMaskOnboarding>()

  useEffect(() => {
    if (!onboarding.current) {
      onboarding.current = new MetaMaskOnboarding()
    }

    if (MetaMaskOnboarding.isMetaMaskInstalled()) {
      setWeb3(new Web3(window.ethereum))
    }
  }, [])

  useEffect(() => {
    const onSetAccount = async (newAccount: string) => {
      if (newAccount && me) {
        // await updateWallet({ variables: { input: { wallet: newAccount } } })
        console.log('Wallet update bypassed')
      }
      setAccount(newAccount)
      setLoadingAccount(false)
    }

    if (MetaMaskOnboarding.isMetaMaskInstalled()) {
      if (window.ethereum.selectedAddress) {
        // MetaMask already connected - request accounts
        window.ethereum
          .request({ method: 'eth_requestAccounts' })
          .then(([newAccount]: string[]) => onSetAccount(newAccount))
          .catch(() => setLoadingAccount(false))
      } else {
        // MetaMask not yet connected - mark as ready (user can manually connect)
        setLoadingAccount(false)
        setLoadingChain(false)
      }
      window.ethereum.on('accountsChanged', ([newAccount]: string[]) => onSetAccount(newAccount))
      window.ethereum.on('chainChanged', (newChainId: string) => {
        setChainId(parseInt(newChainId, 16))
        // Refetch balances on new chain instead of full reload (preserves audio playback)
        if (account && web3) {
          web3.eth.getBalance(account).then(bal => {
            setBalance(web3.utils.fromWei(bal, 'ether'))
          }).catch(() => {})
          getOGUNBalance(web3).catch(() => {})
        }
      })
    } else {
      // MetaMask not installed - mark as ready
      setLoadingAccount(false)
      setLoadingChain(false)
    }
  }, [me])

  useEffect(() => {
    if (MetaMaskOnboarding.isMetaMaskInstalled()) {
      if (account && web3) {
        onboarding?.current?.stopOnboarding()
        web3.eth.getBalance(account).then(balance => {
          setBalance(web3.utils.fromWei(balance, 'ether'))
        }).catch(() => {})
        getOGUNBalance(web3).catch(() => {})
        window.ethereum.request({ method: 'eth_chainId' }).then((chainId: string) => {
          setChainId(parseInt(chainId, 16))
          setLoadingChain(false)
        }).catch(() => {})
      } else {
        setAccount(undefined)
        setBalance(undefined)
        setOGUNBalance(undefined)
      }
    }
  }, [account, web3])

  const getOGUNBalance = async (web3: Web3) => {
    try {
      const currentBalance = await tokenContract(web3).methods.balanceOf(account).call() as string | undefined
      const validBalance = currentBalance !== undefined && (typeof currentBalance === 'string' || typeof currentBalance === 'number')
        ? currentBalance.toString()
        : '0'
      const formattedBalance = web3.utils.fromWei(validBalance, 'ether')
      setOGUNBalance(formattedBalance)
    } catch {
      // Silent fail - wrong chain or contract unavailable
    }
  }

  const refetchBalance = async () => {
    if (web3 && account) {
      setIsRefetchingBalance(true)
      await web3.eth.getBalance(account).then(balance => {
        setBalance(web3.utils.fromWei(balance, 'ether'))
        setIsRefetchingBalance(false)
      })
      await getOGUNBalance(web3)
    }
  }

  const addMumbaiTestnet = () => {
    if (MetaMaskOnboarding.isMetaMaskInstalled()) {
      window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: network.idHex,
            chainName: network.name,
            nativeCurrency: {
              name: network.name,
              symbol: network.symbol,
              decimals: 18,
            },
            rpcUrls: [network.rpc],
            blockExplorerUrls: [network.blockExplorer],
          },
        ],
      })
    } else {
      onboarding?.current?.startOnboarding()
    }
  }

  const onSetAccount = async (newAccount: string) => {
    // await updateWallet({ variables: { input: { wallet: newAccount } } })
    console.log('Wallet update bypassed')
    setAccount(newAccount)
    setLoadingAccount(false)
  }

  const connect = () => {
    if (MetaMaskOnboarding.isMetaMaskInstalled()) {
      setLoadingAccount(true)
      window.ethereum
        .request({ method: 'eth_requestAccounts' })
        .then(([newAccount]: string[]) => {
          onSetAccount(newAccount)
          // Also fetch chain ID after successful connection
          window.ethereum.request({ method: 'eth_chainId' }).then((chainId: string) => {
            setChainId(parseInt(chainId, 16))
            setLoadingChain(false)
          }).catch(() => setLoadingChain(false))
        })
        .catch((err: any) => {
          console.log('MetaMask connection rejected or failed:', err?.message || err)
          setLoadingAccount(false)
        })
    } else {
      onboarding?.current?.startOnboarding()
    }
  }

  const loading = loadingAccount || loadingChain

  return {
    connect,
    addMumbaiTestnet,
    account,
    balance,
    OGUNBalance,
    chainId,
    web3,
    refetchBalance,
    isRefetchingBalance,
    loading,
  }
}

export default useMetaMask
