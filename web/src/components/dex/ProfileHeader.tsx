import React, { useState } from 'react'
import { Card } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar'
import { ScrollArea } from '../ui/scroll-area'
import {
  Users,
  MessageCircle,
  Share2,
  Wallet,
  Copy,
  TrendingUp,
  Trophy,
  Flame,
  Rocket,
  Zap,
  Settings,
  Gift,
  X,
  Image as ImageIcon,
  Coins,
  Music,
  Play,
  Pause,
  ExternalLink,
  PiggyBank,
  ChevronDown,
  ChevronUp,
  Headphones,
  Upload,
  Clock
} from 'lucide-react'
import useBlockchainV2 from 'hooks/useBlockchainV2'
import { useMagicContext } from 'hooks/useMagicContext'

// Mock profile images
const profileAvatar = "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face"

interface FollowUser {
  id: string
  name: string
  username: string
  userHandle?: string // The actual handle without @ prefix for navigation
  avatar?: string
  isVerified?: boolean
}

interface NFTTrack {
  id: string
  title: string
  artist?: string
  artworkUrl?: string
  audioUrl?: string
  tokenId?: number
  chain?: string
}

interface ProfileHeaderProps {
  user?: {
    name: string
    username: string
    bio: string
    walletAddress: string
    tracks: number
    followers: number
    following: number
    avatar?: string
    isVerified?: boolean
    coverPicture?: string
  }
  isOwnProfile?: boolean // Only show portfolio/sensitive data if viewing own profile
  currentUserWallet?: string // Current logged-in user's wallet for tipping
  ownedNfts?: Array<{ id: string; title: string; artworkUrl?: string }> // For NFT airdrop
  nftCollection?: NFTTrack[] // User's NFT music collection
  followersList?: FollowUser[] // List of followers for avatar grid
  followingList?: FollowUser[] // List of following for avatar grid
  onFollow?: () => void
  onUnfollow?: () => void
  isFollowing?: boolean
  onEditProfile?: () => void
  onProfileClick?: (userHandle: string) => void // Navigate to a user's profile by handle
  onTrackClick?: (trackId: string) => void // Navigate to a track
  onPlayTrack?: (track: NFTTrack) => void // Play a track inline
}

// Tip Bucket Modal Component
function TipBucketModal({
  isOpen,
  onClose,
  recipientName,
  recipientWallet,
  senderWallet,
  ownedNfts = []
}: {
  isOpen: boolean
  onClose: () => void
  recipientName: string
  recipientWallet: string
  senderWallet: string
  ownedNfts?: Array<{ id: string; title: string; artworkUrl?: string; tokenId?: number }>
}) {
  const [activeTab, setActiveTab] = useState<'tip' | 'airdrop'>('tip')
  const [tipAmount, setTipAmount] = useState('')
  const [selectedNfts, setSelectedNfts] = useState<string[]>([])
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Get blockchain functions for real transfers
  const { sendOgun, transferNftToken } = useBlockchainV2()
  const { web3 } = useMagicContext()

  if (!isOpen) return null

  const handleSendTip = async () => {
    if (!tipAmount || parseFloat(tipAmount) <= 0) return
    if (!senderWallet || !recipientWallet) {
      setError('Missing wallet addresses')
      return
    }

    setSending(true)
    setError(null)
    setSuccess(null)

    try {
      // Use actual OGUN transfer via smart contract
      const sendTransaction = sendOgun(recipientWallet, senderWallet, tipAmount)
      if (web3) {
        await sendTransaction.execute(web3)
        setSuccess(`Successfully sent ${tipAmount} OGUN to ${recipientName}!`)
        setTimeout(() => {
          setSending(false)
          onClose()
        }, 2000)
      } else {
        throw new Error('Web3 not initialized')
      }
    } catch (err: any) {
      console.error('OGUN transfer failed:', err)
      setError(err.message || 'Transfer failed. Please try again.')
      setSending(false)
    }
  }

  const handleAirdrop = async () => {
    if (selectedNfts.length === 0) return
    if (!senderWallet || !recipientWallet) {
      setError('Missing wallet addresses')
      return
    }

    setSending(true)
    setError(null)
    setSuccess(null)

    try {
      // Find the selected NFTs with their token IDs
      const nftsToTransfer = ownedNfts.filter(nft => selectedNfts.includes(nft.id))

      if (web3) {
        // Transfer each NFT using the smart contract
        for (const nft of nftsToTransfer) {
          if (nft.tokenId !== undefined) {
            const transferTransaction = transferNftToken(nft.tokenId, senderWallet, recipientWallet, {})
            await transferTransaction.execute(web3)
          }
        }
        setSuccess(`Successfully airdropped ${selectedNfts.length} NFT(s) to ${recipientName}!`)
        setTimeout(() => {
          setSending(false)
          onClose()
        }, 2000)
      } else {
        throw new Error('Web3 not initialized')
      }
    } catch (err: any) {
      console.error('NFT airdrop failed:', err)
      setError(err.message || 'Airdrop failed. Please try again.')
      setSending(false)
    }
  }

  const toggleNftSelection = (nftId: string) => {
    setSelectedNfts(prev =>
      prev.includes(nftId)
        ? prev.filter(id => id !== nftId)
        : [...prev, nftId]
    )
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={onClose} />

      <div className="relative z-10 w-full max-w-md mx-4 overflow-hidden rounded-2xl border border-cyan-500/30 bg-gray-900/95 shadow-2xl">
        {/* Header */}
        <div className="relative px-6 pt-6 pb-4 border-b border-cyan-500/20">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500" />
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 p-0 rounded-full hover:bg-gray-800"
          >
            <X className="w-4 h-4 text-gray-400" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center">
              <Gift className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Tip Bucket</h2>
              <p className="text-sm text-gray-400">Support {recipientName}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-cyan-500/20">
          <button
            onClick={() => setActiveTab('tip')}
            className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 text-sm font-semibold transition-all ${
              activeTab === 'tip'
                ? 'text-yellow-400 border-b-2 border-yellow-400 bg-yellow-500/10'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <Coins className="w-4 h-4" />
            Tip OGUN
          </button>
          <button
            onClick={() => setActiveTab('airdrop')}
            className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 text-sm font-semibold transition-all ${
              activeTab === 'airdrop'
                ? 'text-purple-400 border-b-2 border-purple-400 bg-purple-500/10'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            Airdrop NFT
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'tip' && (
            <div className="space-y-4">
              {/* From/To addresses */}
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-black/40 border border-gray-700">
                  <p className="text-xs text-gray-500 mb-1">From (Your Wallet)</p>
                  <p className="text-sm text-cyan-400 font-mono truncate">{senderWallet}</p>
                </div>
                <div className="flex justify-center">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-b from-yellow-500 to-orange-500 flex items-center justify-center">
                    <span className="text-white text-lg">↓</span>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-black/40 border border-gray-700">
                  <p className="text-xs text-gray-500 mb-1">To ({recipientName})</p>
                  <p className="text-sm text-green-400 font-mono truncate">{recipientWallet}</p>
                </div>
              </div>

              {/* Amount input */}
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Amount (OGUN)</label>
                <div className="relative">
                  <input
                    type="number"
                    value={tipAmount}
                    onChange={(e) => setTipAmount(e.target.value)}
                    placeholder="Enter amount..."
                    className="w-full bg-black/50 border border-cyan-500/30 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500/50"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-2">
                    {[5, 10, 50].map(preset => (
                      <button
                        key={preset}
                        onClick={() => setTipAmount(String(preset))}
                        className="px-2 py-1 text-xs bg-yellow-500/20 text-yellow-400 rounded hover:bg-yellow-500/30"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Send button */}
              <Button
                onClick={handleSendTip}
                disabled={!tipAmount || parseFloat(tipAmount) <= 0 || sending || !web3}
                className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-black font-bold py-3"
              >
                {sending ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    Sending...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Gift className="w-4 h-4" />
                    Send {tipAmount || '0'} OGUN
                  </span>
                )}
              </Button>

              {/* Status Messages */}
              {error && (
                <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/50 text-red-400 text-sm">
                  {error}
                </div>
              )}
              {success && (
                <div className="p-3 rounded-lg bg-green-500/20 border border-green-500/50 text-green-400 text-sm">
                  {success}
                </div>
              )}
              {!web3 && (
                <div className="p-3 rounded-lg bg-yellow-500/20 border border-yellow-500/50 text-yellow-400 text-sm">
                  Please connect your wallet to send OGUN
                </div>
              )}
            </div>
          )}

          {activeTab === 'airdrop' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-400">
                Select NFTs to airdrop to {recipientName}. Ghost tracks, new releases, exclusive content!
              </p>

              {/* NFT Grid */}
              <ScrollArea className="h-64">
                {ownedNfts.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2">
                    {ownedNfts.map(nft => (
                      <div
                        key={nft.id}
                        onClick={() => toggleNftSelection(nft.id)}
                        className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer transition-all ${
                          selectedNfts.includes(nft.id)
                            ? 'ring-2 ring-purple-500 scale-95'
                            : 'hover:ring-1 hover:ring-cyan-500/50'
                        }`}
                      >
                        <img
                          src={nft.artworkUrl || 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=200&h=200&fit=crop'}
                          alt={nft.title}
                          className="w-full h-full object-cover"
                        />
                        {selectedNfts.includes(nft.id) && (
                          <div className="absolute inset-0 bg-purple-500/50 flex items-center justify-center">
                            <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
                              <span className="text-purple-600 text-sm">✓</span>
                            </div>
                          </div>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 bg-black/70 p-1">
                          <p className="text-xs text-white truncate">{nft.title}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                    <ImageIcon className="w-12 h-12 mb-3 opacity-50" />
                    <p className="text-sm">No NFTs available to airdrop</p>
                  </div>
                )}
              </ScrollArea>

              {/* Airdrop button */}
              <Button
                onClick={handleAirdrop}
                disabled={selectedNfts.length === 0 || sending || !web3}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold py-3"
              >
                {sending ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Sending...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Gift className="w-4 h-4" />
                    Airdrop {selectedNfts.length} NFT{selectedNfts.length !== 1 ? 's' : ''}
                  </span>
                )}
              </Button>

              {/* Status Messages */}
              {error && (
                <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/50 text-red-400 text-sm">
                  {error}
                </div>
              )}
              {success && (
                <div className="p-3 rounded-lg bg-green-500/20 border border-green-500/50 text-green-400 text-sm">
                  {success}
                </div>
              )}
              {!web3 && (
                <div className="p-3 rounded-lg bg-yellow-500/20 border border-yellow-500/50 text-yellow-400 text-sm">
                  Please connect your wallet to airdrop NFTs
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Followers/Following Avatar Grid Modal
function FollowersFollowingModal({
  isOpen,
  onClose,
  title,
  users,
  onProfileClick
}: {
  isOpen: boolean
  onClose: () => void
  title: string
  users: FollowUser[]
  onProfileClick?: (userHandle: string) => void
}) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={onClose} />

      <div className="relative z-10 w-full max-w-lg mx-4 overflow-hidden rounded-2xl border border-cyan-500/30 bg-gray-900/95 shadow-2xl">
        {/* Header */}
        <div className="relative px-6 pt-6 pb-4 border-b border-cyan-500/20">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500" />
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 p-0 rounded-full hover:bg-gray-800"
          >
            <X className="w-4 h-4 text-gray-400" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{title}</h2>
              <p className="text-sm text-gray-400">{users.length} profiles</p>
            </div>
          </div>
        </div>

        {/* Avatar Grid */}
        <div className="p-6">
          <ScrollArea className="h-80">
            {users.length > 0 ? (
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
                {users.map((user) => (
                  <div
                    key={user.id}
                    onClick={() => user.userHandle && onProfileClick?.(user.userHandle)}
                    className="group cursor-pointer flex flex-col items-center gap-2"
                  >
                    <div className="relative">
                      <Avatar className="w-14 h-14 ring-2 ring-transparent group-hover:ring-cyan-500/50 transition-all">
                        <AvatarImage src={user.avatar || profileAvatar} />
                        <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-purple-600 text-white">
                          {user.name?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      {user.isVerified && (
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-gradient-to-r from-cyan-400 to-purple-600 rounded-full flex items-center justify-center border-2 border-gray-900">
                          <div className="w-2 h-2 bg-white rounded-full" />
                        </div>
                      )}
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-white truncate max-w-[60px] group-hover:text-cyan-400 transition-colors">
                        {user.name}
                      </p>
                      <p className="text-[10px] text-gray-500 truncate max-w-[60px]">
                        {user.username}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <Users className="w-12 h-12 mb-3 opacity-50" />
                <p className="text-sm">No {title.toLowerCase()} yet</p>
              </div>
            )}
          </ScrollArea>
        </div>
      </div>
    </div>
  )
}

// NFT Collection Modal - Figma-style grid with inline playback
function NFTCollectionModal({
  isOpen,
  onClose,
  title,
  walletAddress,
  nfts,
  onTrackClick,
  onPlayTrack,
  currentlyPlayingId,
  chain = 'Polygon'
}: {
  isOpen: boolean
  onClose: () => void
  title: string
  walletAddress: string
  nfts: NFTTrack[]
  onTrackClick?: (trackId: string) => void
  onPlayTrack?: (track: NFTTrack) => void
  currentlyPlayingId?: string
  chain?: string
}) {
  if (!isOpen) return null

  const formatWallet = (addr: string) => {
    if (!addr || addr.length < 10) return 'Unknown'
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={onClose} />

      <div className="relative z-10 w-full max-w-2xl mx-4 overflow-hidden rounded-2xl border border-cyan-500/30 bg-gray-900/95 shadow-2xl">
        {/* Header */}
        <div className="relative px-6 pt-6 pb-4 border-b border-cyan-500/20">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-500" />
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 p-0 rounded-full hover:bg-gray-800"
          >
            <X className="w-4 h-4 text-gray-400" />
          </Button>
          <h2 className="text-lg font-bold text-white mb-1">{title}</h2>
        </div>

        {/* Wallet Info Card - Figma style */}
        <div className="p-4">
          <div className="rounded-xl border border-cyan-500/30 bg-black/40 p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                <Wallet className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-500">{chain}</p>
                <p className="text-sm text-cyan-400 font-mono">{formatWallet(walletAddress)}</p>
              </div>
              <Badge variant="outline" className="border-cyan-500/50 text-cyan-400">
                {nfts.length} NFTs
              </Badge>
            </div>

            {/* NFT Grid - Figma style */}
            <div className="mt-3">
              <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider">NFT Collection</p>
              <ScrollArea className="h-64">
                {nfts.length > 0 ? (
                  <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
                    {nfts.map((nft) => (
                      <div
                        key={nft.id}
                        className="group relative aspect-square rounded-lg overflow-hidden cursor-pointer border border-transparent hover:border-cyan-500/50 transition-all"
                        onClick={() => onTrackClick?.(nft.id)}
                      >
                        {/* NFT Artwork */}
                        <img
                          src={nft.artworkUrl || 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=100&h=100&fit=crop'}
                          alt={nft.title}
                          className="w-full h-full object-cover"
                        />

                        {/* Play button overlay */}
                        {nft.audioUrl && (
                          <div
                            className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                            onClick={(e) => {
                              e.stopPropagation()
                              onPlayTrack?.(nft)
                            }}
                          >
                            <div className="w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center">
                              {currentlyPlayingId === nft.id ? (
                                <Pause className="w-4 h-4 text-white" />
                              ) : (
                                <Play className="w-4 h-4 text-white ml-0.5" />
                              )}
                            </div>
                          </div>
                        )}

                        {/* Currently playing indicator */}
                        {currentlyPlayingId === nft.id && (
                          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-400 to-purple-500">
                            <div className="h-full w-1/3 bg-white/50 animate-pulse" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                    <Music className="w-12 h-12 mb-3 opacity-50" />
                    <p className="text-sm">No NFTs in this collection</p>
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6">
          <Button
            variant="outline"
            className="w-full border-cyan-500/30 hover:bg-cyan-500/10 text-cyan-400"
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  )
}

// WIN-WIN Stats Modal - AS/400 IBM Retro Terminal Style
function WinWinStatsModal({
  isOpen,
  onClose,
  userName,
  walletAddress,
  isOwnProfile = false
}: {
  isOpen: boolean
  onClose: () => void
  userName: string
  walletAddress: string
  isOwnProfile?: boolean
}) {
  const [expandedSection, setExpandedSection] = useState<string | null>('earnings')
  const [blinkCursor, setBlinkCursor] = useState(true)

  // Blinking cursor effect
  React.useEffect(() => {
    const interval = setInterval(() => setBlinkCursor(prev => !prev), 500)
    return () => clearInterval(interval)
  }, [])

  if (!isOpen) return null

  // Mock WIN-WIN data (in production, fetch from API)
  const winWinData = {
    // Creator stats (if viewing own profile or has earnings data)
    creator: {
      totalEarned: '1,247.83',
      todayEarned: '12.45',
      totalStreams: '24,891',
      todayStreams: '342',
      topTrack: 'Midnight Dreams',
      topTrackEarnings: '458.32',
      avgPerStream: '0.05',
      nftBonus: '10x',
      verifiedBonus: '1.5x'
    },
    // Listener stats
    listener: {
      totalEarned: '156.72',
      todayEarned: '3.21',
      dailyLimit: '50.00',
      dailyRemaining: '46.79',
      tracksStreamed: '1,892',
      todayTracksStreamed: '47',
      favoriteArtist: 'JSan619',
      minutesListened: '4,521'
    },
    // System info
    system: {
      contractAddress: '0xcf94...F28546',
      chain: 'Polygon Mainnet',
      treasuryFunded: '5,000,000',
      totalDistributed: '847,291.45',
      lastPayout: '2026-01-07 18:42:31'
    }
  }

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section)
  }

  const formatWallet = (addr: string) => {
    if (!addr || addr.length < 10) return '0x0000...0000'
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/95" onClick={onClose} />

      {/* AS/400 Terminal Window */}
      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-none border-2 border-cyan-500 bg-black shadow-[0_0_30px_rgba(6,182,212,0.3),inset_0_0_60px_rgba(0,0,0,0.8)]">
        {/* Terminal Header - IBM AS/400 Style */}
        <div className="bg-gradient-to-r from-cyan-900 to-cyan-800 px-4 py-2 flex items-center justify-between border-b border-cyan-500">
          <div className="flex items-center gap-2">
            <PiggyBank className="w-5 h-5 text-yellow-400" />
            <span className="font-mono text-cyan-100 text-sm tracking-wider">
              WIN-WIN REWARDS SYSTEM v2.0
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="w-6 h-6 p-0 text-cyan-300 hover:text-white hover:bg-cyan-700/50"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* System Status Bar */}
        <div className="bg-cyan-950/50 px-4 py-1 border-b border-cyan-500/50 flex items-center justify-between font-mono text-xs">
          <span className="text-cyan-400">SOUNDCHAIN://OGUN/REWARDS</span>
          <span className="text-green-400 flex items-center gap-1">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            ONLINE
          </span>
        </div>

        {/* Terminal Content */}
        <div className="p-4 font-mono text-sm max-h-[70vh] overflow-y-auto">
          {/* Welcome Banner */}
          <div className="text-center mb-4 text-cyan-500 border border-cyan-500/30 p-2">
            <pre className="text-[10px] leading-tight text-cyan-400">{`
╔═══════════════════════════════════════════╗
║   ██╗    ██╗██╗███╗   ██╗                 ║
║   ██║    ██║██║████╗  ██║                 ║
║   ██║ █╗ ██║██║██╔██╗ ██║  ━━━━━━━━━━━    ║
║   ██║███╗██║██║██║╚██╗██║  WIN-WIN        ║
║   ╚███╔███╔╝██║██║ ╚████║                 ║
║    ╚══╝╚══╝ ╚═╝╚═╝  ╚═══╝  REWARDS       ║
╚═══════════════════════════════════════════╝`}</pre>
          </div>

          {/* User Info Line */}
          <div className="mb-4 text-cyan-300">
            <span className="text-green-400">&gt;</span> USER: <span className="text-yellow-400">{userName}</span>
            <br />
            <span className="text-green-400">&gt;</span> WALLET: <span className="text-purple-400">{formatWallet(walletAddress)}</span>
            {blinkCursor && <span className="text-cyan-400">█</span>}
          </div>

          {/* Creator Earnings Section */}
          <div className="mb-3">
            <button
              onClick={() => toggleSection('earnings')}
              className="w-full flex items-center justify-between text-left p-2 bg-cyan-950/30 border border-cyan-500/30 hover:border-cyan-400/50 transition-colors"
            >
              <span className="flex items-center gap-2">
                <Upload className="w-4 h-4 text-purple-400" />
                <span className="text-cyan-100">CREATOR EARNINGS</span>
              </span>
              {expandedSection === 'earnings' ? (
                <ChevronUp className="w-4 h-4 text-cyan-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-cyan-400" />
              )}
            </button>
            {expandedSection === 'earnings' && (
              <div className="border border-t-0 border-cyan-500/30 p-3 bg-black/50 space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-400">TOTAL_EARNED:</span>
                  <span className="text-green-400">{winWinData.creator.totalEarned} OGUN</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">TODAY_EARNED:</span>
                  <span className="text-yellow-400">+{winWinData.creator.todayEarned} OGUN</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">TOTAL_STREAMS:</span>
                  <span className="text-cyan-400">{winWinData.creator.totalStreams}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">TOP_TRACK:</span>
                  <span className="text-purple-400">{winWinData.creator.topTrack}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">NFT_MULTIPLIER:</span>
                  <span className="text-orange-400">{winWinData.creator.nftBonus}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">VERIFIED_BONUS:</span>
                  <span className="text-pink-400">{winWinData.creator.verifiedBonus}</span>
                </div>
                <div className="mt-2 pt-2 border-t border-cyan-500/20 text-xs text-gray-500">
                  [ CREATORS EARN 70% OF STREAM REWARDS ]
                </div>
              </div>
            )}
          </div>

          {/* Listener Earnings Section */}
          <div className="mb-3">
            <button
              onClick={() => toggleSection('listening')}
              className="w-full flex items-center justify-between text-left p-2 bg-cyan-950/30 border border-cyan-500/30 hover:border-cyan-400/50 transition-colors"
            >
              <span className="flex items-center gap-2">
                <Headphones className="w-4 h-4 text-cyan-400" />
                <span className="text-cyan-100">LISTENER EARNINGS</span>
              </span>
              {expandedSection === 'listening' ? (
                <ChevronUp className="w-4 h-4 text-cyan-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-cyan-400" />
              )}
            </button>
            {expandedSection === 'listening' && (
              <div className="border border-t-0 border-cyan-500/30 p-3 bg-black/50 space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-400">TOTAL_EARNED:</span>
                  <span className="text-green-400">{winWinData.listener.totalEarned} OGUN</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">TODAY_EARNED:</span>
                  <span className="text-yellow-400">+{winWinData.listener.todayEarned} OGUN</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">DAILY_LIMIT:</span>
                  <span className="text-orange-400">{winWinData.listener.dailyLimit} OGUN</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">REMAINING_TODAY:</span>
                  <span className="text-cyan-400">{winWinData.listener.dailyRemaining} OGUN</span>
                </div>
                {/* Progress bar for daily limit */}
                <div className="mt-2">
                  <div className="h-2 bg-gray-800 border border-cyan-500/30">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-purple-500"
                      style={{ width: `${(parseFloat(winWinData.listener.todayEarned) / parseFloat(winWinData.listener.dailyLimit)) * 100}%` }}
                    />
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">TRACKS_STREAMED:</span>
                  <span className="text-cyan-400">{winWinData.listener.tracksStreamed}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">MINUTES_LISTENED:</span>
                  <span className="text-purple-400">{winWinData.listener.minutesListened}</span>
                </div>
                <div className="mt-2 pt-2 border-t border-cyan-500/20 text-xs text-gray-500">
                  [ LISTENERS EARN 30% OF STREAM REWARDS ]
                </div>
              </div>
            )}
          </div>

          {/* System Info Section */}
          <div className="mb-3">
            <button
              onClick={() => toggleSection('system')}
              className="w-full flex items-center justify-between text-left p-2 bg-cyan-950/30 border border-cyan-500/30 hover:border-cyan-400/50 transition-colors"
            >
              <span className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-yellow-400" />
                <span className="text-cyan-100">SYSTEM STATUS</span>
              </span>
              {expandedSection === 'system' ? (
                <ChevronUp className="w-4 h-4 text-cyan-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-cyan-400" />
              )}
            </button>
            {expandedSection === 'system' && (
              <div className="border border-t-0 border-cyan-500/30 p-3 bg-black/50 space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-400">CONTRACT:</span>
                  <span className="text-purple-400 text-xs">{winWinData.system.contractAddress}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">CHAIN:</span>
                  <span className="text-cyan-400">{winWinData.system.chain}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">TREASURY_FUNDED:</span>
                  <span className="text-green-400">{winWinData.system.treasuryFunded} OGUN</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">TOTAL_DISTRIBUTED:</span>
                  <span className="text-yellow-400">{winWinData.system.totalDistributed} OGUN</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">LAST_PAYOUT:</span>
                  <span className="text-gray-300 text-xs">{winWinData.system.lastPayout}</span>
                </div>
              </div>
            )}
          </div>

          {/* Command Line Footer */}
          <div className="mt-4 pt-3 border-t border-cyan-500/30">
            <div className="text-cyan-400 text-xs">
              <span className="text-green-400">&gt;</span> STREAM_TO_EARN | EVERYONE_WINS
              {blinkCursor && <span className="ml-1">█</span>}
            </div>
            <div className="text-gray-500 text-[10px] mt-1">
              NFT tracks earn 10x base rate • Verified artists get 1.5x bonus
            </div>
          </div>
        </div>

        {/* Terminal Footer */}
        <div className="bg-gradient-to-r from-cyan-900 to-purple-900 px-4 py-2 border-t border-cyan-500 flex items-center justify-between">
          <span className="font-mono text-[10px] text-cyan-300">
            SOUNDCHAIN WIN-WIN v2.0.0 | POLYGON
          </span>
          <div className="flex items-center gap-2">
            <Coins className="w-4 h-4 text-yellow-400" />
            <span className="font-mono text-xs text-yellow-400">5M OGUN TREASURY</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function BlurAggregatorPanel() {
  const [activeTab, setActiveTab] = useState("overview")
  // Note: context exports 'ogunBalance' and 'balance', not magic-prefixed names
  const { ogunBalance, balance } = useMagicContext()

  return (
    <Card className="retro-card p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="retro-title text-lg">Portfolio</h2>
        <div className="flex gap-2">
          <Button
            variant={activeTab === "overview" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("overview")}
            className={activeTab === "overview" ? "retro-button" : ""}
          >
            Overview
          </Button>
          <Button
            variant={activeTab === "market" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("market")}
            className={activeTab === "market" ? "retro-button" : ""}
          >
            Market
          </Button>
        </div>
      </div>

      {activeTab === "overview" && (
        <>
          {/* Portfolio Value - Real balances from MagicContext */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="metadata-section p-4">
                <div className="metadata-label">OGUN Balance</div>
                <div className="retro-text text-xl text-white">
                  {ogunBalance ? parseFloat(ogunBalance).toLocaleString(undefined, { maximumFractionDigits: 2 }) : '0'} OGUN
                </div>
                <div className="text-sm text-cyan-400">SoundChain Token</div>
              </div>
              <div className="metadata-section p-4">
                <div className="metadata-label">POL Balance</div>
                <div className="retro-text text-xl text-white">
                  {balance ? parseFloat(balance).toFixed(4) : '0'} POL
                </div>
                <div className="text-sm text-purple-400">Polygon Native</div>
              </div>
            </div>
          </div>

          {/* Activity - Coming Soon */}
          <div className="space-y-3">
            <h3 className="metadata-label">Recent Activity</h3>
            <div className="text-center py-6 text-gray-500">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Transaction history coming soon</p>
              <p className="text-xs text-gray-600 mt-1">Track your buys, sells, and listings</p>
            </div>
          </div>
        </>
      )}

      {activeTab === "market" && (
        <div className="space-y-4">
          <h3 className="metadata-label">Top Collections</h3>
          <ScrollArea className="h-48">
            <div className="space-y-2">
              {topCollections.map((collection, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg bg-black/20 border border-cyan-500/10 hover:border-cyan-500/30 transition-colors"
                >
                  <div>
                    <div className="text-sm font-medium text-white">
                      {collection.name}
                    </div>
                    <div className="retro-json text-xs">
                      Floor: {collection.floor} Ξ
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="retro-text text-sm">
                      {collection.volume} Ξ
                    </div>
                    <div
                      className={`text-xs ${collection.change.startsWith("+") ? "text-green-400" : "text-red-400"}`}
                    >
                      {collection.change}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </Card>
  )
}

export function ProfileHeader({
  user,
  isOwnProfile = false,
  currentUserWallet = '',
  ownedNfts = [],
  nftCollection = [],
  followersList = [],
  followingList = [],
  onFollow,
  onUnfollow,
  isFollowing = false,
  onEditProfile,
  onProfileClick,
  onTrackClick,
  onPlayTrack
}: ProfileHeaderProps) {
  const [showTipBucket, setShowTipBucket] = useState(false)
  const [showFollowersModal, setShowFollowersModal] = useState(false)
  const [showFollowingModal, setShowFollowingModal] = useState(false)
  const [showNFTModal, setShowNFTModal] = useState(false)
  const [showWinWinModal, setShowWinWinModal] = useState(false)
  const [currentlyPlayingId, setCurrentlyPlayingId] = useState<string | undefined>(undefined)

  // Handle inline track play
  const handlePlayTrack = (track: NFTTrack) => {
    if (currentlyPlayingId === track.id) {
      setCurrentlyPlayingId(undefined)
    } else {
      setCurrentlyPlayingId(track.id)
      onPlayTrack?.(track)
    }
  }

  const defaultUser = {
    name: "Xamã",
    username: "@xama",
    bio: "The official SoundChain account. Here is an example of what the bio should look like on the profile.",
    walletAddress: "0xf30...345",
    tracks: 25,
    followers: 3537,
    following: 1237,
    avatar: profileAvatar,
    isVerified: true,
    coverPicture: undefined as string | undefined,
  }

  const userData = user || defaultUser

  // Format wallet address for display (full address, truncated in UI)
  // Validates that it's a proper Ethereum address (0x + 40 hex chars)
  const formatWalletAddress = (address: string) => {
    if (!address || address === '0x...' || address.length < 10) return 'Not connected'
    // Validate it's a proper Ethereum address format
    const isValidEthAddress = /^0x[a-fA-F0-9]{40}$/.test(address)
    if (!isValidEthAddress) return 'Not connected'
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const copyAddress = () => {
    const isValidEthAddress = /^0x[a-fA-F0-9]{40}$/.test(userData.walletAddress || '')
    if (userData.walletAddress && isValidEthAddress) {
      navigator.clipboard.writeText(userData.walletAddress)
      alert('Address copied!')
    }
  }

  return (
    <div className="relative z-10">
      {/* Full-screen Background Cover */}
      <div className="absolute inset-0 -z-10 h-80 lg:h-96">
        {userData.coverPicture ? (
          <img
            src={userData.coverPicture}
            alt="Cover"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-purple-900 via-cyan-900 to-black" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/50 to-black" />
      </div>

      <div className="pt-32 lg:pt-48 pb-6">
      <div className="max-w-screen-2xl mx-auto px-4 lg:px-6">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
          {/* Left Side - User Profile */}
          <div className="flex flex-col lg:flex-row gap-6 items-start">
            {/* Profile image */}
            <div className="relative">
              <div className="w-40 lg:w-48 h-40 lg:h-48 rounded-3xl overflow-hidden analog-glow">
                <img
                  src={userData.avatar}
                  alt="User Profile"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-gradient-to-r from-green-400 to-cyan-400 rounded-full border-4 border-black/50 flex items-center justify-center shadow-lg">
                <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
              </div>
            </div>

            {/* Profile info - with glassmorphism for readability over cover art */}
            <div className="flex-1 space-y-4 bg-black/60 backdrop-blur-md rounded-2xl p-4 lg:p-6 border border-white/10 shadow-xl">
              <div className="space-y-2">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="retro-title text-2xl lg:text-3xl drop-shadow-lg">{userData.name}</h1>
                  {userData.isVerified && (
                    <div className="w-6 h-6 bg-gradient-to-r from-cyan-400 to-purple-600 rounded-full flex items-center justify-center analog-glow">
                      <div className="w-3 h-3 bg-white rounded-full" />
                    </div>
                  )}
                </div>
                <p className="retro-json text-sm">{userData.username}</p>
                <p className="text-gray-200 text-sm lg:text-base max-w-md leading-relaxed drop-shadow-md">
                  {userData.bio}
                </p>
              </div>

              {/* Real-time Stats Grid */}
              <div className="grid grid-cols-3 gap-3 lg:gap-4">
                <div
                  className="metadata-section p-3 lg:p-4 text-center cursor-pointer hover:border-purple-400/50 transition-colors"
                  onClick={() => setShowNFTModal(true)}
                >
                  <div className="retro-text text-xl lg:text-2xl">{userData.tracks.toLocaleString()}</div>
                  <div className="metadata-label text-xs">Tracks</div>
                </div>
                <div
                  className="metadata-section p-3 lg:p-4 text-center cursor-pointer hover:border-cyan-400/50 transition-colors"
                  onClick={() => setShowFollowersModal(true)}
                >
                  <div className="retro-text text-xl lg:text-2xl">{userData.followers.toLocaleString()}</div>
                  <div className="metadata-label text-xs">Followers</div>
                </div>
                <div
                  className="metadata-section p-3 lg:p-4 text-center cursor-pointer hover:border-cyan-400/50 transition-colors"
                  onClick={() => setShowFollowingModal(true)}
                >
                  <div className="retro-text text-xl lg:text-2xl">{userData.following.toLocaleString()}</div>
                  <div className="metadata-label text-xs">Following</div>
                </div>
              </div>

              {/* Action buttons - Different for own profile vs other profiles */}
              <div className="flex flex-wrap gap-3">
                {isOwnProfile ? (
                  <>
                    {/* Own profile - Edit Profile button */}
                    <Button
                      className="retro-button"
                      onClick={onEditProfile}
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Edit Profile
                    </Button>
                    <Button variant="outline" className="border-cyan-500/50 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300">
                      <Share2 className="w-4 h-4 mr-2" />
                      Share
                    </Button>
                  </>
                ) : (
                  <>
                    {/* Other profile - Follow/Unfollow + Message + Tip */}
                    <Button
                      className={isFollowing ? "border-cyan-500/50 bg-cyan-500/10 hover:bg-red-500/20 text-cyan-300" : "retro-button"}
                      variant={isFollowing ? "outline" : "default"}
                      onClick={isFollowing ? onUnfollow : onFollow}
                    >
                      <Users className="w-4 h-4 mr-2" />
                      {isFollowing ? 'Unfollow' : 'Follow'}
                    </Button>
                    <Button variant="outline" className="border-purple-500/50 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300">
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Message
                    </Button>
                    {/* Tip Bucket Button */}
                    <Button
                      variant="outline"
                      className="border-yellow-500/50 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-300"
                      onClick={() => setShowTipBucket(true)}
                      title="Tip Bucket - Send OGUN or Airdrop NFTs"
                    >
                      <Gift className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" className="border-cyan-500/50 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300">
                      <Share2 className="w-4 h-4" />
                    </Button>
                  </>
                )}
              </div>

              {/* Wallet address with full Polygon address */}
              <Card className="retro-card p-3 w-fit">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg">
                    <Wallet className="w-3 h-3 text-white" />
                  </div>
                  <span className="retro-json text-sm font-mono text-cyan-400">
                    {formatWalletAddress(userData.walletAddress)}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={copyAddress}
                    className="hover:bg-cyan-500/20 p-1"
                    title="Copy full address"
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                  {/* WIN-WIN Piggy Bank - Shows earnings stats */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowWinWinModal(true)}
                    className="hover:bg-pink-500/20 p-1 group"
                    title="WIN-WIN Rewards Stats"
                  >
                    <PiggyBank className="w-4 h-4 text-pink-400 group-hover:text-pink-300 group-hover:scale-110 transition-all" />
                  </Button>
                  {/* Tip Bucket quick access for non-own profiles */}
                  {!isOwnProfile && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowTipBucket(true)}
                      className="hover:bg-yellow-500/20 p-1"
                      title="Tip this creator"
                    >
                      <Gift className="w-3 h-3 text-yellow-400" />
                    </Button>
                  )}
                </div>
              </Card>

              {/* Achievements */}
              <div className="space-y-3">
                <h3 className="metadata-label">Achievements</h3>
                <div className="flex gap-2">
                  {[
                    { icon: Trophy, color: "from-yellow-400 to-orange-500" },
                    { icon: Flame, color: "from-red-500 to-pink-500" },
                    { icon: Rocket, color: "from-blue-500 to-purple-600" },
                    { icon: Zap, color: "from-green-400 to-cyan-500" },
                  ].map((achievement, index) => (
                    <div
                      key={index}
                      className={`w-10 h-10 bg-gradient-to-br ${achievement.color} rounded-xl flex items-center justify-center transition-all duration-300 hover:scale-110 hover:rotate-12 shadow-lg analog-glow`}
                    >
                      <achievement.icon className="w-5 h-5 text-white drop-shadow-lg" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Blur-style Aggregator (Only visible to profile owner) */}
          {isOwnProfile && (
            <div className="xl:flex xl:justify-end">
              <div className="w-full max-w-md">
                <BlurAggregatorPanel />
              </div>
            </div>
          )}
        </div>
      </div>
      </div>

      {/* Tip Bucket Modal */}
      <TipBucketModal
        isOpen={showTipBucket}
        onClose={() => setShowTipBucket(false)}
        recipientName={userData.name}
        recipientWallet={userData.walletAddress}
        senderWallet={currentUserWallet}
        ownedNfts={ownedNfts}
      />

      {/* Followers Modal */}
      <FollowersFollowingModal
        isOpen={showFollowersModal}
        onClose={() => setShowFollowersModal(false)}
        title="Followers"
        users={followersList}
        onProfileClick={onProfileClick}
      />

      {/* Following Modal */}
      <FollowersFollowingModal
        isOpen={showFollowingModal}
        onClose={() => setShowFollowingModal(false)}
        title="Following"
        users={followingList}
        onProfileClick={onProfileClick}
      />

      {/* NFT Collection Modal */}
      <NFTCollectionModal
        isOpen={showNFTModal}
        onClose={() => setShowNFTModal(false)}
        title={`${userData.name}'s NFT Collection`}
        walletAddress={userData.walletAddress}
        nfts={nftCollection}
        onTrackClick={onTrackClick}
        onPlayTrack={handlePlayTrack}
        currentlyPlayingId={currentlyPlayingId}
        chain="Polygon"
      />

      {/* WIN-WIN Stats Modal - AS/400 Retro Terminal Quick Glance */}
      <WinWinStatsModal
        isOpen={showWinWinModal}
        onClose={() => setShowWinWinModal(false)}
        userName={userData.name}
        walletAddress={userData.walletAddress}
        isOwnProfile={isOwnProfile}
      />
    </div>
  )
}
