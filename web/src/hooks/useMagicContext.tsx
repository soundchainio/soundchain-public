/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { OAuthExtension } from '@magic-ext/oauth2'
import { InstanceWithExtensions, SDKBase } from '@magic-sdk/provider'
import { getJwt, setJwt } from 'lib/apollo'
import { Magic, RPCErrorCode } from 'magic-sdk'
import { createContext, ReactNode, useCallback, useContext, useEffect, useState, useRef } from 'react'
import Web3 from 'web3'
import { network } from '../lib/blockchainNetworks'
import { useMe } from './useMe'
import { errorHandler } from 'utils/errorHandler'
import SoundchainOGUN20 from '../contract/SoundchainOGUN20.sol/SoundchainOGUN20.json'
import { config } from 'config'
import { AbiItem } from 'web3-utils'
import { useLoginMutation } from 'lib/graphql'

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
  isRestoringSession: boolean  // True while restoring session on page refresh
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
  const [login] = useLoginMutation()
  const [magic, setMagic] = useState<MagicInstance>(null)
  const [web3, setWeb3] = useState<Web3 | null>(null)
  const [account, setAccount] = useState('')
  const [maticBalance, setMaticBalance] = useState('')
  const [ogunBalance, setOgunBalance] = useState('')
  const [isRefetchingBalance, setIsRefetchingBalance] = useState(false)
  const [isRestoringSession, setIsRestoringSession] = useState(false)
  const sessionRestorationAttempted = useRef(false)

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

  // Session restoration - runs on ALL pages (not just login)
  // This fixes the issue where page refresh logs users out
  useEffect(() => {
    const restoreSession = async () => {
      // Only attempt once per mount
      if (sessionRestorationAttempted.current) return
      sessionRestorationAttempted.current = true

      // Skip if not browser or Magic not ready
      if (typeof window === 'undefined' || !magic) {
        console.log('[SessionRestore] Skipping - not browser or magic not ready')
        return
      }

      // Skip if already have user data (already logged in)
      if (me) {
        console.log('[SessionRestore] Already logged in (me exists), skipping')
        return
      }

      // Check if we already have a valid JWT - this is the primary auth
      const existingJwt = getJwt()
      if (existingJwt) {
        console.log('[SessionRestore] JWT exists, skipping restoration')
        return
      }

      // No JWT - check for stored Magic didToken
      const storedToken = localStorage.getItem('didToken')
      if (!storedToken) {
        console.log('[SessionRestore] No stored didToken, user needs to log in')
        return
      }

      console.log('[SessionRestore] Found stored didToken, validating with Magic...')
      setIsRestoringSession(true)

      try {
        // Validate the stored token with Magic SDK
        // Extended timeout for mobile networks (can be slow)
        const isLoggedInPromise = magic.user.isLoggedIn()
        const timeoutPromise = new Promise<boolean>((_, reject) =>
          setTimeout(() => reject(new Error('isLoggedIn timeout')), 10000) // 10s for mobile
        )

        let isLoggedIn: boolean
        try {
          isLoggedIn = await Promise.race([isLoggedInPromise, timeoutPromise])
        } catch (timeoutErr) {
          // On timeout, try to use token anyway - Magic session might still be valid
          console.log('[SessionRestore] isLoggedIn timed out, trying token anyway...')
          isLoggedIn = true // Assume valid, let server validate
        }

        if (isLoggedIn) {
          console.log('[SessionRestore] Magic session valid, exchanging for JWT...')
          const loginResult = await login({ variables: { input: { token: storedToken } } })

          if (loginResult.data?.login.jwt) {
            await setJwt(loginResult.data.login.jwt)
            console.log('[SessionRestore] Session restored successfully!')
          } else {
            console.log('[SessionRestore] Login mutation succeeded but no JWT returned')
            // Try getting a fresh token from Magic
            try {
              const freshToken = await magic.user.getIdToken()
              if (freshToken) {
                console.log('[SessionRestore] Got fresh token, retrying login...')
                localStorage.setItem('didToken', freshToken)
                const retryResult = await login({ variables: { input: { token: freshToken } } })
                if (retryResult.data?.login.jwt) {
                  await setJwt(retryResult.data.login.jwt)
                  console.log('[SessionRestore] Session restored with fresh token!')
                }
              }
            } catch (freshErr) {
              console.log('[SessionRestore] Fresh token attempt failed:', freshErr)
            }
          }
        } else {
          console.log('[SessionRestore] Magic session expired, clearing stored token')
          localStorage.removeItem('didToken')
        }
      } catch (error: any) {
        console.log('[SessionRestore] Restoration failed:', error.message)
        // Don't clear token on network errors - might be temporary
        if (!error.message?.includes('timeout') && !error.message?.includes('network')) {
          localStorage.removeItem('didToken')
        }
      } finally {
        setIsRestoringSession(false)
      }
    }

    restoreSession()
  }, [magic, me, login])

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

  // Helper to get the user's wallet address from any OAuth method
  const getUserWalletAddress = useCallback(() => {
    // Debug: Log all available wallet addresses
    console.log('💳 getUserWalletAddress - checking all OAuth wallets:', {
      authMethod: me?.authMethod,
      magicWalletAddress: me?.magicWalletAddress,
      googleWalletAddress: me?.googleWalletAddress,
      discordWalletAddress: me?.discordWalletAddress,
      twitchWalletAddress: me?.twitchWalletAddress,
      emailWalletAddress: me?.emailWalletAddress,
    })

    // Check all possible OAuth wallet addresses
    // Order: magic (email) > google > discord > twitch > email
    const wallet = me?.magicWalletAddress ||
                   me?.googleWalletAddress ||
                   me?.discordWalletAddress ||
                   me?.twitchWalletAddress ||
                   me?.emailWalletAddress ||
                   null

    console.log('💳 getUserWalletAddress - selected wallet:', wallet)
    return wallet
  }, [me?.magicWalletAddress, me?.googleWalletAddress, me?.discordWalletAddress, me?.twitchWalletAddress, me?.emailWalletAddress, me?.authMethod])

  const handleSetAccount = useCallback(async () => {
    try {
      if (web3) {
        const [accountFromWeb3] = await web3.eth.getAccounts()

        if (accountFromWeb3) {
          console.log('💳 Magic: Got account from web3:', accountFromWeb3)
          setAccount(accountFromWeb3)
        } else {
          // Fallback: Try all OAuth wallet addresses
          const fallbackWallet = getUserWalletAddress()
          if (fallbackWallet) {
            console.log('💳 Magic: Using fallback OAuth wallet:', fallbackWallet)
            setAccount(fallbackWallet)
          } else {
            console.log('💳 Magic: No account available from web3 or user profile')
          }
        }
      }
    } catch (error) {
      // Even on error, try to use fallback addresses
      const fallbackWallet = getUserWalletAddress()
      if (fallbackWallet) {
        console.log('💳 Magic: Error getting account, using fallback OAuth wallet:', fallbackWallet)
        setAccount(fallbackWallet)
      } else {
        handleError(error as Error | { code: number })
      }
    }
  }, [handleError, web3, getUserWalletAddress])

  const handleSetBalance = useCallback(async () => {
    try {
      if (!account) {
        console.log('💰 No account set, cannot fetch POL balance')
        return
      }

      // Use Magic's web3 or fallback to public RPC
      const rpcUrl = network.rpc || 'https://polygon-rpc.com'
      const web3Instance = web3 || new Web3(rpcUrl)

      console.log('💰 Fetching POL balance for account:', account, 'using RPC:', web3 ? 'Magic web3' : rpcUrl)
      const maticBalance = await web3Instance.eth.getBalance(account)
      const balanceEther = Number(web3Instance.utils.fromWei(maticBalance, 'ether')).toFixed(6)
      console.log('💰 POL balance result:', balanceEther)
      setMaticBalance(balanceEther)
    } catch (error) {
      console.error('💰 Balance fetch error:', error)
      // Don't propagate error - just log it
    }
  }, [account, web3])

  const handleSetOgunBalance = useCallback(async () => {
    try {
      const ogunAddress = config.ogunTokenAddress

      if (!ogunAddress) {
        console.log('💎 No OGUN token address in config, skipping balance fetch')
        setOgunBalance(prev => prev || '0')
        return
      }

      if (!account) {
        console.log('💎 No account set, cannot fetch OGUN balance')
        return
      }

      // Use Magic's web3 or fallback to public RPC (Polygon)
      const rpcUrl = network.rpc || 'https://polygon-rpc.com'
      const web3Instance = web3 || new Web3(rpcUrl)

      console.log('💎 Fetching OGUN balance for account:', account, 'using RPC:', web3 ? 'Magic web3' : rpcUrl)
      const ogunContract = new web3Instance.eth.Contract(SoundchainOGUN20.abi as AbiItem[], ogunAddress)

      try {
        const tokenAmount = await ogunContract.methods.balanceOf(account).call()
        console.log('💎 Raw OGUN balance:', tokenAmount, 'type:', typeof tokenAmount)

        // Handle BigInt, string, or number from web3.js (v4 returns BigInt)
        let validTokenAmount: string
        if (typeof tokenAmount === 'bigint') {
          validTokenAmount = tokenAmount.toString()
        } else if (typeof tokenAmount === 'string' || typeof tokenAmount === 'number') {
          validTokenAmount = String(tokenAmount)
        } else {
          console.log('💎 Unexpected token amount type:', typeof tokenAmount, tokenAmount)
          validTokenAmount = '0'
        }

        const tokenAmountInEther = Number(web3Instance.utils.fromWei(validTokenAmount, 'ether')).toFixed(6)
        console.log('💎 OGUN balance in ether:', tokenAmountInEther)
        setOgunBalance(tokenAmountInEther)
      } catch (contractErr: any) {
        console.error('💎 OGUN contract call failed:', contractErr?.message || contractErr)
        setOgunBalance(prev => prev || '0')
      }
    } catch (error: any) {
      console.error('💎 OGUN balance fetch failed:', error?.message || error)
      setOgunBalance(prev => prev || '0')
    }
  }, [account, web3])

  // Fetch account when web3 is ready (or when me changes with wallet info)
  useEffect(() => {
    if (!me) return

    // If web3 is ready, use full flow
    if (web3) {
      handleSetAccount()
      return
    }

    // Fallback: Set account from user profile even without web3
    // This ensures balances can be fetched using public RPC
    // Check ALL OAuth wallet addresses, not just magicWalletAddress
    const fallbackWallet = getUserWalletAddress()
    // Set account if we have a wallet and either no account or different account
    if (fallbackWallet && (!account || account.toLowerCase() !== fallbackWallet.toLowerCase())) {
      console.log('💳 Magic: Setting account from profile (no web3):', fallbackWallet, 'previous:', account || 'none')
      setAccount(fallbackWallet)
    }
  }, [me, web3, handleSetAccount, getUserWalletAddress])

  // Debounce ref to prevent rapid re-fetches
  const balanceFetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastFetchedAccountRef = useRef<string | null>(null)

  // Fetch balances when account is set (separate effect to avoid stale closure)
  // Note: web3 is no longer required - we fallback to public RPC
  useEffect(() => {
    if (!account) return

    // Skip if we just fetched for this account (prevents flickering)
    if (lastFetchedAccountRef.current === account && balanceFetchTimeoutRef.current) {
      return
    }

    // Clear any pending fetch
    if (balanceFetchTimeoutRef.current) {
      clearTimeout(balanceFetchTimeoutRef.current)
    }

    // Debounce the fetch to prevent rapid re-fetches
    balanceFetchTimeoutRef.current = setTimeout(() => {
      console.log('💰 Fetching balances for account:', account, '(web3:', web3 ? 'available' : 'using public RPC', ')')
      lastFetchedAccountRef.current = account
      handleSetBalance()
      handleSetOgunBalance()
    }, 100) // 100ms debounce

    return () => {
      if (balanceFetchTimeoutRef.current) {
        clearTimeout(balanceFetchTimeoutRef.current)
      }
    }
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
        isRestoringSession,  // True while restoring session on page refresh
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
