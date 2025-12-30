/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { OAuthExtension } from '@magic-ext/oauth'
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
}

const MagicContext = createContext<MagicContextData>({} as MagicContextData);

interface MagicProviderProps {
  children: ReactNode
}

// Create client-side Magic instance with OAuth2 extension (uses popup flow)
// Note: @magic-ext/oauth2 package exports "OAuthExtension" class
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

  const handleSetAccount = useCallback(async () => {
    try {
      if (web3) {
        const [account] = await web3.eth.getAccounts()
        setAccount(account)
      }
    } catch (error) {
      handleError(error as Error | { code: number })
    }
  }, [handleError, web3])

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
      if (!config.ogunTokenAddress) throw Error('No token contract address found when setting Ogun balance')
      if (web3 && account) {
        const ogunContract = new web3.eth.Contract(SoundchainOGUN20.abi as AbiItem[], config.ogunTokenAddress)
        const tokenAmount = await ogunContract.methods.balanceOf(account).call()
        // Type guard to ensure tokenAmount is a valid string or number
        const validTokenAmount = typeof tokenAmount === 'string' || typeof tokenAmount === 'number' ? tokenAmount : '0'
        const tokenAmountInEther = Number(web3.utils.fromWei(validTokenAmount, 'ether')).toFixed(6)
        setOgunBalance(tokenAmountInEther)
      }
    } catch (error) {
      handleError(error as Error | { code: number })
    }
  }, [account, handleError, web3])

  // Fetch account when web3 is ready
  useEffect(() => {
    if (!me || !web3) return
    handleSetAccount()
  }, [me, web3, handleSetAccount])

  // Fetch balances when account is set (separate effect to avoid stale closure)
  useEffect(() => {
    if (!account || !web3) return
    console.log('💰 Fetching balances for account:', account)
    handleSetBalance()
    handleSetOgunBalance()
  }, [account, web3, handleSetBalance, handleSetOgunBalance])

  return (
    <MagicContext.Provider
      value={{ magic, web3, account, balance: maticBalance, ogunBalance, refetchBalance, isRefetchingBalance, isLoggedIn: !!me }}
    >
      {children}
    </MagicContext.Provider>
  )
}

export const useMagicContext = () => useContext(MagicContext);

export default MagicProvider;
