/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { OAuthExtension } from '@magic-ext/oauth'
import { InstanceWithExtensions, SDKBase } from '@magic-sdk/provider'
import { getJwt, setJwt } from 'lib/apollo'
import { Magic, RPCErrorCode } from 'magic-sdk'
import { createContext, ReactNode, useCallback, useContext, useEffect, useState, useRef } from 'react'
import Web3 from 'web3'
import { useMe } from './useMe'
import { errorHandler } from 'utils/errorHandler'
import SoundchainOGUN20 from '../contract/SoundchainOGUN20.sol/SoundchainOGUN20.json'
import { config } from 'config'
import { AbiItem } from 'web3-utils'
import { useLoginMutation } from 'hooks/useMutationsDirect'  // Phase 7f — Vercel-direct

const magicPublicKey = process.env.NEXT_PUBLIC_MAGIC_KEY || 'pk_live_858EC1BFF763F101';

// Type for Magic instance with OAuth extension
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

// Create client-side Magic instance with OAuth extension + Polygon network config.
// Network config tells Magic's iframe to route signing to Polygon (chainId 137).
// Without it, Magic defaults to Ethereum mainnet for signing popups.
// NOTE: This works with @magic-ext/oauth (v1) but NOT with @magic-ext/oauth2 (v2).
// Magic SDK: auth + signing ONLY. No custom rpcUrl.
// Custom rpcUrl was blocked by Magic's iframe CSP → [-32603] Failed to fetch.
// Fix per Magic support (Fin): remove rpcUrl, let Magic use their default Polygon RPC.
// All blockchain READS use lib/directRpc.ts (polygon-bor-rpc.publicnode.com).
// Magic ONLY needed for: login (OAuth) + transaction signing.
const createMagic = (magicPublicKey: string): MagicInstance => {
  try {
    if (typeof window === 'undefined') return null;

    const magicInstance = new Magic(magicPublicKey, {
      extensions: [new OAuthExtension()],
      network: {
        chainId: 137,
      },
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
      if (typeof window === 'undefined' || !magic) return

      // Skip if already have user data (already logged in)
      if (me) return

      // Check if we already have a valid JWT - this is the primary auth
      const existingJwt = getJwt()
      if (existingJwt) return

      // Mobile Safari: Skip Magic iframe validation entirely.
      // ITP blocks cross-origin iframe communication, causing SERVICE_ERROR
      // that corrupts Magic SDK state for subsequent login attempts.
      // Users on mobile Safari must re-login via the login page flow.
      const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
      const isMobileSafari = /Safari/i.test(ua) && !/Chrome|CriOS|Chromium/i.test(ua) && /iPhone|iPad|iPod/i.test(ua)
      if (isMobileSafari) {
        // Skip Magic iframe validation entirely on mobile Safari (ITP blocks cross-origin iframes).
        localStorage.removeItem('didToken')
        return
      }

      // No JWT - check for stored Magic didToken
      const storedToken = localStorage.getItem('didToken')
      if (!storedToken) return

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
          isLoggedIn = true // Assume valid, let server validate
        }

        if (isLoggedIn) {
          const loginResult = await login({ variables: { input: { token: storedToken } } })

          if (loginResult.data?.login.jwt) {
            await setJwt(loginResult.data.login.jwt)
          } else {
            // Try getting a fresh token from Magic
            try {
              const freshToken = await magic.user.getIdToken()
              if (freshToken) {
                localStorage.setItem('didToken', freshToken)
                const retryResult = await login({ variables: { input: { token: freshToken } } })
                if (retryResult.data?.login.jwt) {
                  await setJwt(retryResult.data.login.jwt)
                }
              }
            } catch (freshErr) {
              // Silently fail — user will be redirected to login on next gated route.
            }
          }
        } else {
          localStorage.removeItem('didToken')
        }
      } catch (error: any) {
        // Always clear token on SERVICE_ERROR to prevent repeated failures
        if (error.message?.includes('SERVICE_ERROR')) {
          localStorage.removeItem('didToken')
        } else if (!error.message?.includes('timeout') && !error.message?.includes('network')) {
          // Don't clear token on network errors - might be temporary
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
      // Use Magic's built-in wallet connection UI
      const accounts = await (magic as any).wallet.connectWithUI()

      if (accounts && accounts.length > 0) {
        setWalletConnectedAddress(accounts[0])
        // Store in localStorage for persistence
        localStorage.setItem('magic_wallet_connected', accounts[0])
        return accounts
      }
      return null
    } catch (error: any) {
      // Surface only genuine errors; "user cancelled" is not an error.
      if (!error?.message?.includes('User denied') && !error?.message?.includes('cancelled')) {
        console.error('Magic wallet connect error:', error?.message || error)
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

  // Helper to get the user's wallet address from any method
  const getUserWalletAddress = useCallback(() => {
    // Check all possible wallet addresses
    // Order: hdWallet (new users) > magic (email) > google > discord > twitch > email
    const wallet = me?.hdWalletAddress ||
                   me?.magicWalletAddress ||
                   me?.googleWalletAddress ||
                   me?.discordWalletAddress ||
                   me?.twitchWalletAddress ||
                   me?.emailWalletAddress ||
                   null

    return wallet
  }, [me?.hdWalletAddress, me?.magicWalletAddress, me?.googleWalletAddress, me?.discordWalletAddress, me?.twitchWalletAddress, me?.emailWalletAddress, me?.authMethod])

  const handleSetAccount = useCallback(async () => {
    try {
      if (web3) {
        const [accountFromWeb3] = await web3.eth.getAccounts()

        if (accountFromWeb3) {
          setAccount(accountFromWeb3)
        } else {
          const fallbackWallet = getUserWalletAddress()
          if (fallbackWallet) setAccount(fallbackWallet)
        }
      }
    } catch (error) {
      // Even on error, try to use fallback addresses
      const fallbackWallet = getUserWalletAddress()
      if (fallbackWallet) {
        setAccount(fallbackWallet)
      } else {
        handleError(error as Error | { code: number })
      }
    }
  }, [handleError, web3, getUserWalletAddress])

  const handleSetBalance = useCallback(async () => {
    try {
      if (!account) return

      // Parse balance safely (handles BigInt from web3.js v4)
      const parseBalance = (raw: any, w3: Web3): string => {
        const balStr = typeof raw === 'bigint' ? raw.toString() : String(raw || '0')
        return Number(w3.utils.fromWei(balStr, 'ether')).toFixed(6)
      }

      // Use direct RPC (bypasses Magic's proxy which can corrupt responses)
      const directWeb3 = new Web3('https://polygon-bor-rpc.publicnode.com')
      const maticBalance = await directWeb3.eth.getBalance(account)
      setMaticBalance(parseBalance(maticBalance, directWeb3))
    } catch (error) {
      console.error('Balance fetch error:', error)
    }
  }, [account])

  const handleSetOgunBalance = useCallback(async () => {
    try {
      const ogunAddress = config.ogunTokenAddress
      if (!ogunAddress || !account) return

      // Use direct RPC (bypasses Magic's proxy)
      const directWeb3 = new Web3('https://polygon-bor-rpc.publicnode.com')
      const ogunContract = new directWeb3.eth.Contract(SoundchainOGUN20.abi as AbiItem[], ogunAddress)
      const tokenAmount = await ogunContract.methods.balanceOf(account).call()
      const balStr = typeof tokenAmount === 'bigint' ? tokenAmount.toString() : String(tokenAmount || '0')
      setOgunBalance(Number(directWeb3.utils.fromWei(balStr, 'ether')).toFixed(6))
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
