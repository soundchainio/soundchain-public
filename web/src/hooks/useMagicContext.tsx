/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { OAuthExtension } from '@magic-ext/oauth2'
import { InstanceWithExtensions, SDKBase } from '@magic-sdk/provider'
import { setJwt } from 'lib/apollo'
import { Magic, RPCErrorCode } from 'magic-sdk'
import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react'
import Web3 from 'web3'
import { network } from '../lib/blockchainNetworks'
import { useMe } from './useMe'
import { errorHandler } from 'utils/errorHandler'
import SoundchainOGUN20 from '../contract/SoundchainOGUN20.sol/SoundchainOGUN20.json'
import { config } from 'config'
import { AbiItem } from 'web3-utils'

const magicPublicKey = process.env.NEXT_PUBLIC_MAGIC_KEY || 'pk_live_858EC1BFF763F101';

// Type for Magic instance with OAuth2 extension (oauth2 package exports OAuthExtension)
type MagicInstance = InstanceWithExtensions<SDKBase, OAuthExtension[]> | null;

interface MagicContextData {
  magic: MagicInstance
  web3: Web3 | null
  account: string | undefined
  balance: string | undefined
  ogunBalance: string | undefined
  refetchBalance: () => Promise<void>
  isRefetchingBalance: boolean
  isLoggedIn: boolean
  // Magic Wallet Module - connect external wallets
  connectWallet: () => Promise<string[] | null>
  walletConnectedAddress: string | null
  isConnectingWallet: boolean
  disconnectExternalWallet: () => void
  getWalletProvider: () => Promise<any>
}

const MagicContext = createContext<MagicContextData>({} as MagicContextData);

interface MagicProviderProps {
  children: ReactNode
}

// Create client-side Magic instance with OAuth extension
// Note: Using network config WITH OAuth works fine with loginWithRedirect
const createMagic = (magicPublicKey: string): MagicInstance => {
  try {
    if (typeof window === 'undefined') return null;

    const magicInstance = new Magic(magicPublicKey, {
      network: {
        rpcUrl: network.rpc,
        chainId: network.id,
      },
      extensions: [new OAuthExtension()],
    });

    return magicInstance as MagicInstance;
  } catch {
    return null
  }
}

// Create Web3 instance
const createWeb3 = (
  magic: NonNullable<MagicInstance>,
): Web3 | null => {
  try {
    return new Web3((magic as any).rpcProvider)
  } catch {
    return null
  }
}

export function MagicProvider({ children }: MagicProviderProps) {
  const me = useMe()
  const [magic, setMagic] = useState<MagicInstance>(null)
  const [web3, setWeb3] = useState<Web3 | null>(null)
  const [account, setAccount] = useState('')
  const [maticBalance, setMaticBalance] = useState('')
  const [ogunBalance, setOgunBalance] = useState('')
  const [isRefetchingBalance, setIsRefetchingBalance] = useState(false)

  // Magic Wallet Module state
  const [walletConnectedAddress, setWalletConnectedAddress] = useState<string | null>(null)
  const [isConnectingWallet, setIsConnectingWallet] = useState(false)

  // Initialize Magic SDK on the client side
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const magicInstance = createMagic(magicPublicKey)
      console.log("Magic instance created:", magicInstance);
      setMagic(magicInstance)
      if (magicInstance) (window as any).magic = magicInstance;
      if (magicInstance) {
        setWeb3(createWeb3(magicInstance))
      } else {
        setWeb3(null)
      }
    }
  }, [])

  const handleError = useCallback(async (error: Error | { code: number }) => {
    if ('code' in error && error.code === RPCErrorCode.InternalError) {
      await magic?.user.logout()
      return setJwt()
    }

    errorHandler(error)
  }, [magic])

  const refetchBalance = async () => {
    try {
      setIsRefetchingBalance(true)
      await handleSetBalance()
      await handleSetOgunBalance()
    } catch (error) {
      handleError(error as Error | { code: number })
    } finally {
      setIsRefetchingBalance(false)
    }
  }

  // Magic Wallet Module - Connect external wallets (MetaMask, etc.)
  const connectWallet = useCallback(async (): Promise<string[] | null> => {
    if (!magic) {
      console.error('Magic SDK not initialized')
      return null
    }

    try {
      setIsConnectingWallet(true)
      console.log('🔗 Opening Magic wallet connect UI...')

      // Use Magic's built-in wallet connection UI
      const accounts = await (magic as any).wallet.connectWithUI()
      console.log('🔗 Wallet connected:', accounts)

      if (accounts && accounts.length > 0) {
        setWalletConnectedAddress(accounts[0])
        // Store in localStorage for persistence
        localStorage.setItem('magic_wallet_connected', accounts[0])
        return accounts
      }
      return null
    } catch (error: any) {
      console.error('🔗 Wallet connect error:', error)
      // User closed modal or cancelled
      if (error.message?.includes('User denied') || error.message?.includes('cancelled')) {
        console.log('🔗 User cancelled wallet connection')
      }
      return null
    } finally {
      setIsConnectingWallet(false)
    }
  }, [magic])

  // Disconnect external wallet
  const disconnectExternalWallet = useCallback(() => {
    setWalletConnectedAddress(null)
    localStorage.removeItem('magic_wallet_connected')
    console.log('🔗 External wallet disconnected')
  }, [])

  // Get wallet provider for web3/ethers integration
  const getWalletProvider = useCallback(async () => {
    if (!magic) {
      console.error('Magic SDK not initialized')
      return null
    }
    try {
      const provider = await (magic as any).wallet.getProvider()
      return provider
    } catch (error) {
      console.error('Error getting wallet provider:', error)
      return null
    }
  }, [magic])

  // Restore wallet connection from localStorage on mount
  useEffect(() => {
    const savedAddress = localStorage.getItem('magic_wallet_connected')
    if (savedAddress) {
      setWalletConnectedAddress(savedAddress)
    }
  }, [])

  const handleSetAccount = useCallback(async () => {
    try {
      if (web3) {
        const [accountFromWeb3] = await web3.eth.getAccounts()

        if (accountFromWeb3) {
          console.log('💳 Magic: Got account from web3:', accountFromWeb3)
          setAccount(accountFromWeb3)
        } else if (me?.magicWalletAddress) {
          // FIX: Use magicWalletAddress (actual 0x address), NOT defaultWallet (which is an ENUM)
          console.log('💳 Magic: Using fallback magicWalletAddress:', me.magicWalletAddress)
          setAccount(me.magicWalletAddress)
        } else {
          console.log('💳 Magic: No account available from web3 or user profile')
        }
      }
    } catch (error) {
      // Even on error, try to use fallback addresses
      // FIX: Use magicWalletAddress (actual 0x address), NOT defaultWallet (which is an ENUM)
      if (me?.magicWalletAddress) {
        console.log('💳 Magic: Error getting account, using fallback magicWalletAddress:', me.magicWalletAddress)
        setAccount(me.magicWalletAddress)
      } else {
        handleError(error as Error | { code: number })
      }
    }
  }, [handleError, web3, me?.magicWalletAddress])

  const handleSetBalance = useCallback(async () => {
    try {
      if (web3 && account) {
        const maticBalance = await web3.eth.getBalance(account)
        setMaticBalance(Number(web3.utils.fromWei(maticBalance, 'ether')).toFixed(6))
      }
    } catch (error) {
      handleError(error as Error | { code: number })
    }
  }, [account, handleError, web3])

  const handleSetOgunBalance = useCallback(async () => {
    try {
      const ogunAddress = config.ogunTokenAddress

      if (!ogunAddress) {
        console.log('💎 No OGUN token address in config, skipping balance fetch')
        setOgunBalance('0')
        return
      }

      if (web3 && account) {
        // Check if we're on Polygon (chain 137) - OGUN only exists there
        try {
          const chainId = await web3.eth.getChainId()
          if (Number(chainId) !== 137) {
            console.log('💎 Not on Polygon, skipping OGUN balance fetch')
            setOgunBalance('0')
            return
          }
        } catch {
          // Can't get chain ID - skip OGUN balance
          setOgunBalance('0')
          return
        }

        console.log('💎 Fetching OGUN balance for account:', account)
        const ogunContract = new web3.eth.Contract(SoundchainOGUN20.abi as AbiItem[], ogunAddress)
        const tokenAmount = await ogunContract.methods.balanceOf(account).call()
        console.log('💎 Raw OGUN balance:', tokenAmount, 'type:', typeof tokenAmount)

        // Handle BigInt, string, or number from web3.js (v4 returns BigInt)
        let validTokenAmount: string
        if (typeof tokenAmount === 'bigint') {
          validTokenAmount = tokenAmount.toString()
        } else if (typeof tokenAmount === 'string' || typeof tokenAmount === 'number') {
          validTokenAmount = String(tokenAmount)
        } else {
          validTokenAmount = '0'
        }

        const tokenAmountInEther = Number(web3.utils.fromWei(validTokenAmount, 'ether')).toFixed(6)
        console.log('💎 OGUN balance in ether:', tokenAmountInEther)
        setOgunBalance(tokenAmountInEther)
      }
    } catch (error) {
      // Don't propagate OGUN balance errors - just set to 0
      console.log('💎 OGUN balance fetch failed, setting to 0')
      setOgunBalance('0')
    }
  }, [account, web3])

  // Fetch account when web3 is ready (or when me changes with wallet info)
  useEffect(() => {
    if (!me || !web3) return
    // Also trigger when user's wallet addresses become available
    handleSetAccount()
  }, [me, web3, handleSetAccount, me?.magicWalletAddress])

  // Fetch balances when account is set (separate effect to avoid stale closure)
  useEffect(() => {
    if (!account || !web3) return
    console.log('💰 Fetching balances for account:', account)
    handleSetBalance()
    handleSetOgunBalance()
  }, [account, web3, handleSetBalance, handleSetOgunBalance])

  return (
    <MagicContext.Provider
      value={{
        magic,
        web3,
        account,
        balance: maticBalance,
        ogunBalance,
        refetchBalance,
        isRefetchingBalance,
        isLoggedIn: !!me,
        // Magic Wallet Module
        connectWallet,
        walletConnectedAddress,
        isConnectingWallet,
        disconnectExternalWallet,
        getWalletProvider,
      }}
    >
      {children}
    </MagicContext.Provider>
  )
}

export const useMagicContext = () => useContext(MagicContext);

export default MagicProvider;
