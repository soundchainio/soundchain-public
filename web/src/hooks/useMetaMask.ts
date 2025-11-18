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
        window.ethereum
          .request({ method: 'eth_requestAccounts' })
          .then(([newAccount]: string[]) => onSetAccount(newAccount))
      }
      window.ethereum.on('accountsChanged', ([newAccount]: string[]) => onSetAccount(newAccount))
      window.ethereum.on('chainChanged', () => window.location.reload())
    }
  }, [me])

  useEffect(() => {
    if (MetaMaskOnboarding.isMetaMaskInstalled()) {
      if (account && web3) {
        onboarding?.current?.stopOnboarding()
        web3.eth.getBalance(account).then(balance => {
          setBalance(web3.utils.fromWei(balance, 'ether'))
        })
        getOGUNBalance(web3)
        window.ethereum.request({ method: 'eth_chainId' }).then((chainId: string) => {
          setChainId(parseInt(chainId, 16))
          setLoadingChain(false)
        })
      } else {
        setAccount(undefined)
        setBalance(undefined)
        setOGUNBalance(undefined)
      }
    }
  }, [account, web3])

  const getOGUNBalance = async (web3: Web3) => {
    const currentBalance = await tokenContract(web3).methods.balanceOf(account).call() as string | undefined
    const validBalance = currentBalance !== undefined && (typeof currentBalance === 'string' || typeof currentBalance === 'number')
      ? currentBalance.toString()
      : '0'
    const formattedBalance = web3.utils.fromWei(validBalance, 'ether')
    setOGUNBalance(formattedBalance)
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
      window.ethereum
        .request({ method: 'eth_requestAccounts' })
        .then(([newAccount]: string[]) => onSetAccount(newAccount))
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
