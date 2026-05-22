/**
 * Multi-Wallet Aggregator - Connect and view multiple wallets inline
 * Unique feature: View NFTs from all connected wallets in one place
 *
 * HD Wallet Support (Feb 2026):
 * - Shows HD wallet as primary for new users
 * - Shows migration banner for legacy users with Magic wallet only
 * - HD wallet works across ALL EVM chains (Polygon, Ethereum, Base, etc.)
 */

import React, { useState, useEffect, useCallback } from 'react'
import { gql, useMutation } from '@apollo/client'
import { Card } from '../ui/card'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import {
  Wallet,
  X,
  ExternalLink,
  Copy,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Loader2,
  Sparkles,
  ArrowRight,
  Globe,
  Zap,
  KeyRound,
  Info,
  Shield,
  Bolt,
  AlertTriangle,
  Check
} from 'lucide-react'
import { WalletNFTCollection } from './WalletNFTCollection'
import { useMagicContext } from 'hooks/useMagicContext'
import { useUnifiedWallet } from 'contexts/UnifiedWalletContext'
import { useMe } from 'hooks/useMe'
import { config } from 'config'
import Web3 from 'web3'
import { AbiItem } from 'web3-utils'
import SoundchainOGUN20 from 'contract/SoundchainOGUN20.sol/SoundchainOGUN20.json'
import MetaMaskOnboarding from '@metamask/onboarding'
import { SortTrackField, SortOrder, PrimaryWalletType, MigrationStatus } from 'lib/graphql'
import { useGroupedTracksLazy as useGroupedTracksLazyQuery } from 'hooks/useGroupedTracksDirect'  // Phase 7e — Vercel-direct

const UPGRADE_TO_HD_WALLET = gql`
  mutation UpgradeToHdWallet {
    upgradeToHdWallet {
      id
      hdWalletAddress
      hdWalletCreatedAt
      primaryWallet
      migrationStatus
    }
  }
`

interface ConnectedWallet {
  id: string
  type: 'magic' | 'metamask' | 'walletconnect' | 'coinbase' | 'web3modal' | 'rainbow' | 'base' | 'hd'
  address: string
  chainName: string
  chainId?: number
  balance: string
  ogunBalance: string
  nfts: NFTTrack[]
  isActive: boolean
  icon?: string
  isPrimary?: boolean  // HD wallet can be marked as primary
  isMultiChain?: boolean  // HD wallet works on all EVM chains
}

interface NFTTrack {
  id: string
  title: string
  artist?: string
  artworkUrl?: string
  audioUrl?: string
  tokenId?: number | string
}

interface MultiWalletAggregatorProps {
  userWallet?: string
  maticBalance?: string
  ogunBalance?: string
  ownedTracks?: any[]
  onPlayTrack?: (track: any, index: number) => void
  onTrackClick?: (trackId: string) => void
  currentTrackId?: string
  isPlaying?: boolean
}

// Token contract helper - ONLY works on Polygon (chain 137)
const getOgunBalance = async (web3: Web3, address: string): Promise<string> => {
  try {
    // Check if we're on Polygon - OGUN contract only exists there
    const chainId = await web3.eth.getChainId()
    if (Number(chainId) !== 137) {
      // Not on Polygon - OGUN contract doesn't exist
      return '0'
    }

    if (!config.ogunTokenAddress) {
      return '0'
    }

    const contract = new web3.eth.Contract(
      SoundchainOGUN20.abi as AbiItem[],
      config.ogunTokenAddress as string
    )
    const balance = await contract.methods.balanceOf(address).call()
    const validBalance = typeof balance === 'bigint' ? balance.toString() : String(balance || '0')
    return Number(web3.utils.fromWei(validBalance, 'ether')).toFixed(2)
  } catch (err) {
    // Silently fail - contract may not exist on this chain
    console.log('OGUN balance fetch skipped (not on Polygon or contract error)')
    return '0'
  }
}

export function MultiWalletAggregator({
  userWallet,
  maticBalance,
  ogunBalance,
  ownedTracks = [],
  onPlayTrack,
  onTrackClick,
  currentTrackId,
  isPlaying,
}: MultiWalletAggregatorProps) {
  const {
    web3: magicWeb3,
    connectWallet,
    walletConnectedAddress,
    isConnectingWallet,
    disconnectExternalWallet
  } = useMagicContext()

  // Get current user info for HD wallet
  const me = useMe()

  // Web3Modal / Unified Wallet integration
  const {
    activeWalletType,
    activeAddress: web3ModalAddress,
    activeBalance: web3ModalBalance,
    activeOgunBalance: web3ModalOgunBalance,
    isConnected: isWeb3ModalConnected,
    chainName: web3ModalChainName,
    connectWeb3Modal,
    disconnectWallet: disconnectWeb3Modal,
    directWalletSubtype,
    connectedExternalWallets,
    removeExternalWallet,
  } = useUnifiedWallet()

  // HD Wallet state
  const hdWalletAddress = me?.hdWalletAddress
  const primaryWallet = me?.primaryWallet
  const migrationStatus = me?.migrationStatus
  const hasLegacyMagicWallet = !!(me?.magicWalletAddress || me?.googleWalletAddress || me?.discordWalletAddress || me?.twitchWalletAddress)
  const isLegacyUser = hasLegacyMagicWallet && !hdWalletAddress
  // Resolve the legacy OAuth wallet address separately — needed after HD upgrade
  // so we can still show the old wallet for asset migration
  const legacyOAuthAddress = me?.magicWalletAddress || me?.googleWalletAddress || me?.discordWalletAddress || me?.twitchWalletAddress || me?.emailWalletAddress || null
  const hasUpgradedWithLegacy = !!(hdWalletAddress && legacyOAuthAddress && legacyOAuthAddress.toLowerCase() !== hdWalletAddress.toLowerCase())
  const [hdWalletBalance, setHdWalletBalance] = useState<string>('0')
  const [hdWalletOgunBalance, setHdWalletOgunBalance] = useState<string>('0')
  const [isLoadingHdBalance, setIsLoadingHdBalance] = useState(false)
  const [legacyWalletBalance, setLegacyWalletBalance] = useState<string>('0')
  const [legacyWalletOgunBalance, setLegacyWalletOgunBalance] = useState<string>('0')
  const [isLoadingLegacyBalance, setIsLoadingLegacyBalance] = useState(false)
  const [copiedHdAddress, setCopiedHdAddress] = useState(false)

  // HD Wallet upgrade mutation
  const [upgradeToHdWallet, { loading: isGeneratingHd }] = useMutation(UPGRADE_TO_HD_WALLET, {
    onCompleted: (data: any) => {
      const addr = data?.upgradeToHdWallet?.hdWalletAddress
      if (addr) {
        setHdUpgradeSuccess(addr)
        console.log('[HD Upgrade] Success! New address:', addr)
      }
    },
    onError: (err: any) => {
      console.error('[HD Upgrade] Error:', err)
      setHdUpgradeError(err.message || 'Failed to generate HD wallet')
    },
    refetchQueries: ['Me'],
  })
  const [hdUpgradeSuccess, setHdUpgradeSuccess] = useState<string | null>(null)
  const [hdUpgradeError, setHdUpgradeError] = useState<string | null>(null)

  const [connectedWallets, setConnectedWallets] = useState<ConnectedWallet[]>([])
  const [expandedWallets, setExpandedWallets] = useState<Set<string>>(new Set(['magic', 'legacy-oauth']))
  const [hdInfoExpanded, setHdInfoExpanded] = useState(true)
  const [isMetaMaskInstalled, setIsMetaMaskInstalled] = useState(false)
  const [metamaskAddress, setMetamaskAddress] = useState<string | null>(null)
  const [metamaskBalance, setMetamaskBalance] = useState<string>('0')
  const [metamaskOgunBalance, setMetamaskOgunBalance] = useState<string>('0')
  const [isConnectingMetaMask, setIsConnectingMetaMask] = useState(false)

  // NFT fetching for external wallets
  const [externalWalletNfts, setExternalWalletNfts] = useState<Record<string, NFTTrack[]>>({})
  const [loadingNfts, setLoadingNfts] = useState<Record<string, boolean>>({})

  // GraphQL lazy query for fetching NFTs by owner address
  const [fetchNftsForWallet] = useGroupedTracksLazyQuery()

  // Check if MetaMask is installed
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsMetaMaskInstalled(MetaMaskOnboarding.isMetaMaskInstalled())
    }
  }, [])

  // Fetch HD wallet balance (works on Polygon via public RPC)
  useEffect(() => {
    const fetchHdWalletBalance = async () => {
      if (!hdWalletAddress) return

      setIsLoadingHdBalance(true)
      try {
        const web3 = new Web3('https://polygon-bor-rpc.publicnode.com')
        const balance = await web3.eth.getBalance(hdWalletAddress)
        setHdWalletBalance(Number(web3.utils.fromWei(balance, 'ether')).toFixed(4))

        // Fetch OGUN balance
        const ogun = await getOgunBalance(web3, hdWalletAddress)
        setHdWalletOgunBalance(ogun)
      } catch (err) {
        console.error('HD wallet balance fetch error:', err)
      } finally {
        setIsLoadingHdBalance(false)
      }
    }

    fetchHdWalletBalance()
  }, [hdWalletAddress])

  // Fetch legacy OAuth wallet balance after HD upgrade (for migration view)
  useEffect(() => {
    const fetchLegacyBalance = async () => {
      if (!hasUpgradedWithLegacy || !legacyOAuthAddress) return

      setIsLoadingLegacyBalance(true)
      try {
        const web3 = new Web3('https://polygon-bor-rpc.publicnode.com')
        const balance = await web3.eth.getBalance(legacyOAuthAddress)
        setLegacyWalletBalance(Number(web3.utils.fromWei(balance, 'ether')).toFixed(4))

        const ogun = await getOgunBalance(web3, legacyOAuthAddress)
        setLegacyWalletOgunBalance(ogun)
      } catch (err) {
        console.error('Legacy wallet balance fetch error:', err)
      } finally {
        setIsLoadingLegacyBalance(false)
      }
    }

    fetchLegacyBalance()
  }, [hasUpgradedWithLegacy, legacyOAuthAddress])

  // Connect MetaMask directly
  const connectMetaMask = useCallback(async () => {
    if (!isMetaMaskInstalled) {
      const onboarding = new MetaMaskOnboarding()
      onboarding.startOnboarding()
      return
    }

    try {
      setIsConnectingMetaMask(true)
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
      if (accounts && accounts[0]) {
        setMetamaskAddress(accounts[0])

        // Get balances
        const web3 = new Web3(window.ethereum)
        const balance = await web3.eth.getBalance(accounts[0])
        setMetamaskBalance(Number(web3.utils.fromWei(balance, 'ether')).toFixed(4))

        const ogun = await getOgunBalance(web3, accounts[0])
        setMetamaskOgunBalance(ogun)
      }
    } catch (err) {
      console.error('MetaMask connection error:', err)
    } finally {
      setIsConnectingMetaMask(false)
    }
  }, [isMetaMaskInstalled])

  // Disconnect MetaMask
  const disconnectMetaMask = useCallback(() => {
    setMetamaskAddress(null)
    setMetamaskBalance('0')
    setMetamaskOgunBalance('0')
  }, [])

  // Fetch NFTs for any wallet address (SoundChain NFTs on Polygon)
  const fetchNftsForAddress = useCallback(async (address: string) => {
    if (!address || loadingNfts[address] || externalWalletNfts[address]) return

    setLoadingNfts(prev => ({ ...prev, [address]: true }))

    try {
      const result = await fetchNftsForWallet({
        variables: {
          filter: { nftData: { owner: address } },
          sort: { field: SortTrackField.CreatedAt, order: SortOrder.Desc },
        },
      })

      const tracks = result.data?.groupedTracks?.nodes || []
      const nfts: NFTTrack[] = tracks.map((track: any) => ({
        id: track.id,
        title: track.title,
        artist: track.artist || track.profile?.displayName || 'Unknown Artist',
        artworkUrl: track.artworkUrl,
        audioUrl: track.playbackUrl,
        tokenId: track.nftData?.tokenId || track.tokenId,
      }))

      setExternalWalletNfts(prev => ({ ...prev, [address]: nfts }))
    } catch (error) {
      console.error('Failed to fetch NFTs for wallet:', address, error)
      setExternalWalletNfts(prev => ({ ...prev, [address]: [] }))
    } finally {
      setLoadingNfts(prev => ({ ...prev, [address]: false }))
    }
  }, [fetchNftsForWallet, loadingNfts, externalWalletNfts])

  // Auto-fetch NFTs when external wallets connect
  useEffect(() => {
    if (isWeb3ModalConnected && web3ModalAddress && web3ModalAddress !== userWallet) {
      fetchNftsForAddress(web3ModalAddress)
    }
  }, [isWeb3ModalConnected, web3ModalAddress, userWallet, fetchNftsForAddress])

  useEffect(() => {
    if (metamaskAddress && metamaskAddress !== userWallet) {
      fetchNftsForAddress(metamaskAddress)
    }
  }, [metamaskAddress, userWallet, fetchNftsForAddress])

  // Build connected wallets list
  useEffect(() => {
    const wallets: ConnectedWallet[] = []

    // HD Wallet (PRIMARY for new users - multi-chain support)
    if (hdWalletAddress) {
      const isHdPrimary = primaryWallet === PrimaryWalletType.Hd
      wallets.push({
        id: 'hd',
        type: 'hd',
        address: hdWalletAddress,
        chainName: 'Multi-Chain',  // Works on ALL EVM chains
        chainId: 137,  // Default to Polygon for balance display
        balance: hdWalletBalance,
        ogunBalance: hdWalletOgunBalance,
        nfts: isHdPrimary ? ownedTracks.map((t: any) => ({
          id: t.id,
          title: t.title,
          artist: t.artist || t.profile?.displayName || 'Unknown',
          artworkUrl: t.artworkUrl,
          audioUrl: t.playbackUrl,
          tokenId: t.tokenId,
        })) : [],  // NFTs only shown if HD is primary
        isActive: isHdPrimary,
        isPrimary: isHdPrimary,
        isMultiChain: true,
        icon: '🌐'
      })
    }

    // Legacy OAuth Wallet — ALWAYS shown after HD upgrade for asset migration
    // This is the old wallet (Google/Discord/Twitch/Magic) that still holds assets
    if (hasUpgradedWithLegacy && legacyOAuthAddress) {
      wallets.push({
        id: 'legacy-oauth',
        type: 'magic',
        address: legacyOAuthAddress,
        chainName: 'Polygon',
        chainId: 137,
        balance: legacyWalletBalance,
        ogunBalance: legacyWalletOgunBalance,
        // All existing NFTs belong to legacy wallet — HD wallet is new with 0 NFTs
        nfts: ownedTracks.map((t: any) => ({
          id: t.id,
          title: t.title,
          artist: t.artist || t.profile?.displayName || 'Unknown',
          artworkUrl: t.artworkUrl,
          audioUrl: t.playbackUrl,
          tokenId: t.tokenId,
        })),
        isActive: false,
        isPrimary: false,
        icon: '⚠️'
      })
    }

    // Magic/OAuth Wallet (legacy users who haven't upgraded yet)
    if (userWallet && userWallet !== hdWalletAddress && !hasUpgradedWithLegacy) {
      const isMagicPrimary = primaryWallet !== PrimaryWalletType.Hd
      wallets.push({
        id: 'magic',
        type: 'magic',
        address: userWallet,
        chainName: 'Polygon',
        chainId: 137,
        balance: maticBalance || '0',
        ogunBalance: ogunBalance || '0',
        nfts: isMagicPrimary ? ownedTracks.map((t: any) => ({
          id: t.id,
          title: t.title,
          artist: t.artist || t.profile?.displayName || 'Unknown',
          artworkUrl: t.artworkUrl,
          audioUrl: t.playbackUrl,
          tokenId: t.tokenId,
        })) : [],
        isActive: isMagicPrimary && !walletConnectedAddress && !metamaskAddress && !isWeb3ModalConnected,
        isPrimary: isMagicPrimary,
        icon: '✨'
      })
    }

    // Web3Modal Wallet (MetaMask, Coinbase, Rainbow, etc. via Web3Modal)
    if (isWeb3ModalConnected && web3ModalAddress && web3ModalAddress !== userWallet && activeWalletType === 'web3modal') {
      wallets.push({
        id: 'web3modal',
        type: 'web3modal',
        address: web3ModalAddress,
        chainName: web3ModalChainName || 'Unknown Chain',
        balance: web3ModalBalance || '0',
        ogunBalance: web3ModalOgunBalance || '0',
        nfts: externalWalletNfts[web3ModalAddress] || [],
        isActive: activeWalletType === 'web3modal',
        icon: '🔗'
      })
    }

    // Direct SDK Connection (MetaMask, WalletConnect, Coinbase via WalletConnectButton)
    if (activeWalletType === 'direct' && web3ModalAddress && web3ModalAddress !== userWallet) {
      const walletIcon = directWalletSubtype === 'metamask' ? '🦊' :
                        directWalletSubtype === 'coinbase' ? '🔵' :
                        directWalletSubtype === 'walletconnect' ? '🔗' :
                        directWalletSubtype === 'trust' ? '💙' : '💳'
      wallets.push({
        id: `direct-${directWalletSubtype || 'wallet'}`,
        type: (directWalletSubtype as any) || 'walletconnect',
        address: web3ModalAddress,
        chainName: web3ModalChainName || 'Unknown Chain',
        balance: web3ModalBalance || '0',
        ogunBalance: web3ModalOgunBalance || '0',
        nfts: externalWalletNfts[web3ModalAddress] || [],
        isActive: true,
        icon: walletIcon
      })
    }

    // MetaMask Wallet (if connected directly - legacy)
    if (metamaskAddress && metamaskAddress !== userWallet && metamaskAddress !== web3ModalAddress) {
      wallets.push({
        id: 'metamask',
        type: 'metamask',
        address: metamaskAddress,
        chainName: 'Polygon',
        chainId: 137,
        balance: metamaskBalance,
        ogunBalance: metamaskOgunBalance,
        nfts: externalWalletNfts[metamaskAddress] || [],
        isActive: !walletConnectedAddress && !!metamaskAddress && !isWeb3ModalConnected,
        icon: '🦊'
      })
    }

    // Magic Wallet Module connected wallet (external wallets like MetaMask via Magic UI)
    if (walletConnectedAddress && walletConnectedAddress !== userWallet && walletConnectedAddress !== metamaskAddress && walletConnectedAddress !== web3ModalAddress) {
      wallets.push({
        id: 'magic-external',
        type: 'walletconnect',
        address: walletConnectedAddress,
        chainName: 'Polygon',
        chainId: 137,
        balance: '0',
        ogunBalance: '0',
        nfts: externalWalletNfts[walletConnectedAddress] || [],
        isActive: true,
        icon: '🔗'
      })
    }

    // Add all registered external wallets from WalletSelector (persisted in context)
    const existingAddresses = new Set(wallets.map(w => w.address.toLowerCase()))
    for (const extWallet of connectedExternalWallets) {
      if (existingAddresses.has(extWallet.address.toLowerCase())) continue
      const walletIcon = extWallet.walletType === 'metamask' ? '🦊' :
                        extWallet.walletType === 'coinbase' ? '🔵' :
                        extWallet.walletType === 'phantom' ? '👻' :
                        extWallet.walletType === 'walletconnect' ? '🔗' : '💳'
      wallets.push({
        id: `ext-${extWallet.walletType}`,
        type: (extWallet.walletType as any) || 'walletconnect',
        address: extWallet.address,
        chainName: extWallet.chainName || 'Polygon',
        chainId: extWallet.chainId || 137,
        balance: extWallet.balance || '0',
        ogunBalance: extWallet.ogunBalance || '0',
        nfts: externalWalletNfts[extWallet.address] || [],
        isActive: false,
        icon: walletIcon
      })
      // Auto-fetch NFTs for this wallet
      if (!externalWalletNfts[extWallet.address] && !loadingNfts[extWallet.address]) {
        fetchNftsForAddress(extWallet.address)
      }
    }

    setConnectedWallets(wallets)
  }, [userWallet, maticBalance, ogunBalance, ownedTracks, metamaskAddress, metamaskBalance, metamaskOgunBalance, walletConnectedAddress, isWeb3ModalConnected, web3ModalAddress, web3ModalBalance, web3ModalOgunBalance, web3ModalChainName, activeWalletType, directWalletSubtype, externalWalletNfts, connectedExternalWallets, hdWalletAddress, hdWalletBalance, hdWalletOgunBalance, primaryWallet, hasUpgradedWithLegacy, legacyOAuthAddress, legacyWalletBalance, legacyWalletOgunBalance])

  const toggleExpanded = (walletId: string) => {
    setExpandedWallets(prev => {
      const next = new Set(prev)
      if (next.has(walletId)) {
        next.delete(walletId)
      } else {
        next.add(walletId)
      }
      return next
    })
  }

  const getWalletIcon = (type: string, icon?: string) => {
    if (icon) return icon
    switch (type) {
      case 'magic': return '✨'
      case 'hd': return '🌐'  // HD wallet = multi-chain globe
      case 'metamask': return '🦊'
      case 'walletconnect': return '🔗'
      case 'web3modal': return '🌐'
      case 'coinbase': return '🔵'
      case 'rainbow': return '🌈'
      case 'base': return '🔷'
      default: return '💳'
    }
  }

  const getWalletName = (type: string, walletId?: string) => {
    if (walletId === 'legacy-oauth') return 'Legacy OAuth Wallet'
    switch (type) {
      case 'magic': return 'OAuth Wallet'
      case 'hd': return 'Multi-Chain Wallet'
      case 'metamask': return 'MetaMask'
      case 'walletconnect': return 'WalletConnect'
      case 'web3modal': return 'External Wallet'
      case 'coinbase': return 'Coinbase'
      case 'rainbow': return 'Rainbow'
      case 'base': return 'Base'
      default: return 'Wallet'
    }
  }

  // Get chain-specific currency symbol
  const getChainCurrency = (chainName: string) => {
    switch (chainName?.toLowerCase()) {
      case 'ethereum': return 'ETH'
      case 'polygon': return 'POL'
      case 'base': return 'ETH'
      case 'arbitrum': return 'ETH'
      case 'optimism': return 'ETH'
      case 'zetachain': return 'ZETA'
      case 'avalanche': return 'AVAX'
      case 'solana': return 'SOL'
      default: return 'POL'
    }
  }

  const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`

  return (
    <div className="space-y-4">
      {/* HD Wallet Upgrade Panel — Active for legacy OAuth users */}
      {isLegacyUser && (
        <Card className="retro-card border-yellow-500/30 bg-gray-900/80 overflow-hidden">
          {/* Warning banner */}
          <div className="bg-yellow-500/10 border-b border-yellow-500/20 px-3 py-2 flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />
            <span className="text-[11px] text-yellow-400 font-medium">
              Magic RPC is unreliable for legacy wallets. Upgrade to HD wallet for direct blockchain access.
            </span>
          </div>

          <button
            onClick={() => setHdInfoExpanded(!hdInfoExpanded)}
            className="w-full flex items-center justify-between p-3 hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                <Globe className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <span className="text-sm font-medium text-white">HD Wallet Upgrade</span>
              <Badge className="bg-green-500/10 text-green-400 text-[10px]">Free</Badge>
            </div>
            {hdInfoExpanded ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </button>

          {hdInfoExpanded && (
            <div className="px-3 pb-3 space-y-3 border-t border-white/5 pt-3">
              {/* Success state */}
              {hdUpgradeSuccess && (
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Check className="w-4 h-4 text-green-400" />
                    <span className="text-green-400 font-medium text-sm">HD Wallet Generated!</span>
                  </div>
                  <p className="text-[11px] text-gray-400 font-mono break-all">{hdUpgradeSuccess}</p>
                  <p className="text-[11px] text-gray-500 mt-2">
                    Now transfer your NFTs and tokens from your OAuth wallet to this new address using the Send button below. Refresh the page to see your new wallet.
                  </p>
                </div>
              )}

              {/* Error state */}
              {hdUpgradeError && (
                <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/30">
                  <p className="text-red-400 text-xs">{hdUpgradeError}</p>
                </div>
              )}

              {/* Generate button */}
              {!hdUpgradeSuccess && (
                <>
                  <p className="text-gray-400 text-xs">
                    Your OAuth wallet uses Magic&apos;s RPC relay which has known issues for legacy accounts.
                    An <span className="text-cyan-400 font-semibold">HD Wallet</span> connects directly to the blockchain — no middleman, no relay failures.
                  </p>

                  <button
                    onClick={() => {
                      setHdUpgradeError(null)
                      upgradeToHdWallet()
                    }}
                    disabled={isGeneratingHd}
                    className="w-full py-3 rounded-lg font-bold text-sm transition-all bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isGeneratingHd ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4" />
                        Generate HD Wallet (Free, One Click)
                      </>
                    )}
                  </button>

                  <div className="space-y-2">
                    <h5 className="text-white text-xs font-semibold flex items-center gap-1.5">
                      <Bolt className="w-3 h-3 text-yellow-400" />
                      Why Upgrade?
                    </h5>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="flex items-start gap-1.5 text-gray-400">
                        <Shield className="w-3 h-3 text-green-400 mt-0.5 flex-shrink-0" />
                        <span>Direct blockchain TX — no Magic relay</span>
                      </div>
                      <div className="flex items-start gap-1.5 text-gray-400">
                        <Zap className="w-3 h-3 text-yellow-400 mt-0.5 flex-shrink-0" />
                        <span>Fix minting, sending, and staking errors</span>
                      </div>
                      <div className="flex items-start gap-1.5 text-gray-400">
                        <Globe className="w-3 h-3 text-cyan-400 mt-0.5 flex-shrink-0" />
                        <span>Works on Polygon, Ethereum, Base, Arbitrum</span>
                      </div>
                      <div className="flex items-start gap-1.5 text-gray-400">
                        <Sparkles className="w-3 h-3 text-purple-400 mt-0.5 flex-shrink-0" />
                        <span>Same address on every chain — zero cost</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h5 className="text-white text-xs font-semibold flex items-center gap-1.5">
                      <ArrowRight className="w-3 h-3 text-cyan-400" />
                      After Generating
                    </h5>
                    <div className="text-[11px] text-gray-400 space-y-1">
                      <p>1. <span className="text-green-400">Generate</span> your HD wallet (one click above)</p>
                      <p>2. <span className="text-cyan-400">Send</span> NFTs from OAuth wallet → HD wallet</p>
                      <p>3. <span className="text-cyan-400">Send</span> POL & OGUN → HD wallet</p>
                      <p>4. All future TX use HD wallet automatically</p>
                    </div>
                    <p className="text-[10px] text-gray-500 italic">
                      Your OAuth wallet stays visible — migrate assets at your own pace.
                    </p>
                  </div>
                </>
              )}
            </div>
          )}
        </Card>
      )}

      {/* Connected Wallets with NFT Collections */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Wallet className="w-4 h-4 text-purple-400" />
            CONNECTED WALLETS
          </h3>
          <Badge className="bg-purple-500/20 text-purple-400 text-xs">
            {connectedWallets.reduce((acc, w) => acc + w.nfts.length, 0)} Total NFTs
          </Badge>
        </div>

        {connectedWallets.length === 0 ? (
          <Card className="retro-card p-8 text-center">
            <Wallet className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">No wallets connected</p>
            <p className="text-xs text-gray-500 mt-1">Connect a wallet above to view your NFTs</p>
          </Card>
        ) : (
          connectedWallets.map(wallet => (
            <Card
              key={wallet.id}
              className={`retro-card overflow-hidden transition-all ${
                wallet.isActive ? 'border-cyan-500/50' : ''
              } ${wallet.type === 'hd' ? 'border-gradient-to-r from-cyan-500/30 to-purple-500/30' : ''}${
                wallet.id === 'legacy-oauth' ? ' border-yellow-500/30' : ''
              }`}
            >
              {/* HD Wallet Multi-Chain Banner */}
              {wallet.type === 'hd' && wallet.isMultiChain && (
                <div className="bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-cyan-500/20 px-4 py-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs text-cyan-400 font-medium">Works on ALL EVM Chains</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {['Polygon', 'Ethereum', 'Base', 'Arbitrum', 'Optimism'].map(chain => (
                      <div key={chain} className="w-4 h-4 rounded-full bg-gray-700/50 flex items-center justify-center" title={chain}>
                        <span className="text-[8px]">{chain[0]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Legacy OAuth Wallet — Migration Helper Banner */}
              {wallet.id === 'legacy-oauth' && hdWalletAddress && (
                <div className="bg-yellow-500/10 border-b border-yellow-500/20 px-4 py-3">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />
                    <span className="text-xs text-yellow-400 font-semibold">Transfer assets to your new HD Wallet</span>
                  </div>
                  <p className="text-[11px] text-gray-400 mb-2">
                    This is your old OAuth wallet. Send your POL, OGUN, and NFTs to your new HD wallet address below.
                  </p>
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-black/30 border border-cyan-500/20">
                    <ArrowRight className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                    <span className="text-[11px] text-cyan-400 font-mono flex-1 truncate">{hdWalletAddress}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        navigator.clipboard.writeText(hdWalletAddress)
                        setCopiedHdAddress(true)
                        setTimeout(() => setCopiedHdAddress(false), 2000)
                      }}
                      className="text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1 flex-shrink-0"
                    >
                      {copiedHdAddress ? (
                        <><Check className="w-3 h-3" /><span className="text-[10px]">Copied!</span></>
                      ) : (
                        <><Copy className="w-3 h-3" /><span className="text-[10px]">Copy</span></>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Wallet Header - Prioritize balances, minimize address display */}
              <button
                className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
                onClick={() => toggleExpanded(wallet.id)}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg ${
                    wallet.type === 'hd' ? 'bg-gradient-to-br from-cyan-500/30 via-purple-500/30 to-cyan-600/20 border border-cyan-500/30' :
                    wallet.type === 'magic' ? 'bg-gradient-to-br from-cyan-500/30 to-cyan-600/20 border border-cyan-500/30' :
                    wallet.type === 'metamask' ? 'bg-gradient-to-br from-orange-500/30 to-orange-600/20 border border-orange-500/30' :
                    wallet.type === 'web3modal' ? 'bg-gradient-to-br from-purple-500/30 to-purple-600/20 border border-purple-500/30' :
                    'bg-gradient-to-br from-blue-500/30 to-blue-600/20 border border-blue-500/30'
                  }`}>
                    <span className="text-xl">{getWalletIcon(wallet.type, wallet.icon)}</span>
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-bold text-sm">{getWalletName(wallet.type, wallet.id)}</span>
                      {wallet.isPrimary && (
                        <Badge className="bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-cyan-400 text-[10px] px-1.5 border border-cyan-500/30">Primary</Badge>
                      )}
                      {wallet.isActive && !wallet.isPrimary && (
                        <Badge className="bg-green-500/20 text-green-400 text-[10px] px-1.5">Active</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {wallet.type === 'hd' ? (
                        <Badge className="bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-cyan-400 text-[10px] px-1.5 flex items-center gap-1">
                          <Globe className="w-2.5 h-2.5" />
                          Multi-Chain
                        </Badge>
                      ) : (
                        <Badge className={`text-[10px] px-1.5 ${
                          wallet.chainName === 'Polygon' ? 'bg-purple-500/20 text-purple-400' :
                          wallet.chainName === 'Ethereum' ? 'bg-blue-500/20 text-blue-400' :
                          'bg-gray-500/20 text-gray-400'
                        }`}>
                          {wallet.chainName}
                        </Badge>
                      )}
                      <Badge className="bg-purple-500/20 text-purple-400 text-[10px] px-1.5">
                        {wallet.nfts.length} NFTs
                      </Badge>
                    </div>
                  </div>
                </div>
                {/* Balances prominently displayed */}
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-white font-bold">{wallet.balance} <span className="text-gray-400 text-xs">{getChainCurrency(wallet.chainName)}</span></p>
                    <p className="text-purple-400 font-semibold text-sm">{wallet.ogunBalance} <span className="text-purple-400/70 text-xs">OGUN</span></p>
                  </div>
                  {expandedWallets.has(wallet.id) ? (
                    <ChevronUp className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  )}
                </div>
              </button>

              {/* Expanded NFT Collection */}
              {expandedWallets.has(wallet.id) && (
                <div className="border-t border-cyan-500/20 p-4 bg-black/20">
                  {/* Compact address row - only visible when expanded */}
                  <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-800/50">
                    <span className="text-[10px] text-gray-500 font-mono">{formatAddress(wallet.address)}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        navigator.clipboard.writeText(wallet.address)
                      }}
                      className="text-gray-600 hover:text-cyan-400 transition-colors"
                      title="Copy full address"
                    >
                      <Copy className="w-2.5 h-2.5" />
                    </button>
                    <a
                      href={`${config.polygonscan}address/${wallet.address}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-gray-600 hover:text-cyan-400 transition-colors"
                      title="View on Polygonscan"
                    >
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                    <div className="flex-1" />
                    <Badge className="bg-purple-500/20 text-purple-400 text-[10px]">
                      NFT COLLECTION
                    </Badge>
                  </div>
                  {/* Action buttons for wallet management */}
                  <div className="flex items-center justify-end gap-2 mb-3">
                    {/* Reveal Secret Phrase - Magic/OAuth Wallets Only */}
                    {wallet.type === 'magic' && (
                      <a
                        href="https://reveal.magic.link/soundchain"
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs text-yellow-500/70 hover:text-yellow-400 transition-colors flex items-center gap-1"
                        title="Reveal Secret Phrase / Private Key"
                      >
                        <KeyRound className="w-3 h-3" />
                        <span>Export Key</span>
                      </a>
                    )}
                    {wallet.type === 'metamask' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); disconnectMetaMask() }}
                        className="text-xs text-red-500/70 hover:text-red-400 transition-colors"
                      >
                        Disconnect
                      </button>
                    )}
                    {(wallet.type === 'walletconnect' || wallet.id === 'magic-external') && (
                      <button
                        onClick={(e) => { e.stopPropagation(); disconnectExternalWallet() }}
                        className="text-xs text-red-500/70 hover:text-red-400 transition-colors"
                      >
                        Disconnect
                      </button>
                    )}
                    {wallet.type === 'web3modal' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); disconnectWeb3Modal() }}
                        className="text-xs text-red-500/70 hover:text-red-400 transition-colors"
                      >
                        Disconnect
                      </button>
                    )}
                    {wallet.id.startsWith('ext-') && (
                      <button
                        onClick={(e) => { e.stopPropagation(); removeExternalWallet(wallet.type) }}
                        className="text-xs text-red-500/70 hover:text-red-400 transition-colors"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  {loadingNfts[wallet.address] ? (
                    <div className="py-6 text-center">
                      <Loader2 className="w-6 h-6 text-cyan-400 mx-auto animate-spin mb-2" />
                      <div className="text-gray-500 text-sm">Loading SoundChain NFTs...</div>
                    </div>
                  ) : wallet.nfts.length > 0 ? (
                    <div
                      className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 pb-2"
                    >
                      {wallet.nfts.map((nft, index) => (
                        <NFTThumbnail
                          key={nft.id}
                          nft={nft}
                          isPlaying={isPlaying && currentTrackId === nft.id}
                          isCurrentTrack={currentTrackId === nft.id}
                          onPlay={() => onPlayTrack?.(nft, index)}
                          onClick={() => onTrackClick?.(nft.id)}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="py-6 text-center">
                      <div className="text-gray-500 text-sm mb-2">
                        {wallet.type === 'magic'
                          ? 'No tracks collected yet'
                          : `No SoundChain tracks found on ${wallet.chainName}`}
                      </div>
                      {wallet.type !== 'magic' && (
                        <div className="space-y-2">
                          <p className="text-xs text-gray-600">
                            Only SoundChain music tracks are displayed
                          </p>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              // Clear cached NFTs to force refetch
                              setExternalWalletNfts(prev => {
                                const next = { ...prev }
                                delete next[wallet.address]
                                return next
                              })
                              fetchNftsForAddress(wallet.address)
                            }}
                            className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 mx-auto"
                          >
                            <RefreshCw className="w-3 h-3" />
                            Refresh
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Reveal Secret Phrase Section - Magic/OAuth Wallets Only */}
                  {wallet.type === 'magic' && (
                    <div className="mt-4 pt-4 border-t border-yellow-500/20">
                      <a
                        href="https://reveal.magic.link/soundchain"
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 hover:bg-yellow-500/20 transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                            <KeyRound className="w-4 h-4 text-yellow-400" />
                          </div>
                          <div>
                            <p className="text-yellow-400 font-medium text-sm">Reveal Secret Phrase</p>
                            <p className="text-gray-500 text-xs">Export your private key for external use</p>
                          </div>
                        </div>
                        <ExternalLink className="w-4 h-4 text-yellow-400 opacity-50 group-hover:opacity-100 transition-opacity" />
                      </a>
                      <p className="text-[10px] text-gray-600 mt-2 px-1">
                        ⚠️ Never share your secret phrase. Anyone with it has full control of your wallet.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  )
}

// NFT Thumbnail component
function NFTThumbnail({
  nft,
  isPlaying,
  isCurrentTrack,
  onPlay,
  onClick
}: {
  nft: NFTTrack
  isPlaying: boolean
  isCurrentTrack: boolean
  onPlay: () => void
  onClick: () => void
}) {
  const [imageError, setImageError] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const defaultImage = '/default-pictures/album-artwork.png'

  // Simple IPFS transform
  const getImageUrl = (url?: string) => {
    if (!url) return defaultImage
    if (url.startsWith('ipfs://')) {
      return `https://soundchain.mypinata.cloud/ipfs/${url.replace('ipfs://', '')}`
    }
    return url
  }

  const displayImage = imageError ? defaultImage : getImageUrl(nft.artworkUrl)

  return (
    <div
      className={`relative flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden cursor-pointer transition-all duration-200 ${
        isCurrentTrack ? 'ring-2 ring-cyan-400 scale-105' : 'ring-2 ring-yellow-400/60 shadow-[0_0_12px_rgba(250,204,21,0.4),0_0_4px_rgba(250,204,21,0.3)] hover:ring-yellow-400 hover:shadow-[0_0_20px_rgba(250,204,21,0.6),0_0_8px_rgba(250,204,21,0.4)] hover:scale-105'
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      <img
        src={displayImage}
        alt={nft.title}
        className="w-full h-full object-cover"
        onError={() => setImageError(true)}
      />

      {(isHovered || isCurrentTrack) && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
          <button
            onClick={(e) => { e.stopPropagation(); onPlay() }}
            className="w-8 h-8 rounded-full bg-cyan-500 hover:bg-cyan-400 flex items-center justify-center transition-colors"
          >
            {isPlaying && isCurrentTrack ? (
              <span className="text-black text-xs">❚❚</span>
            ) : (
              <span className="text-black text-xs ml-0.5">▶</span>
            )}
          </button>
        </div>
      )}

      {isPlaying && isCurrentTrack && (
        <div className="absolute bottom-0.5 left-0.5 right-0.5">
          <div className="h-0.5 bg-cyan-400 rounded-full animate-pulse" />
        </div>
      )}
    </div>
  )
}

export default MultiWalletAggregator
