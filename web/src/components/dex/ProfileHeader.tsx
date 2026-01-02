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
  Coins
} from 'lucide-react'

// Mock profile images
const profileAvatar = "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face"

interface ProfileHeaderProps {
  user?: {
    name: string
    username: string
    bio: string
    walletAddress: string
    tracks: number
    followers: number
    likes: number
    avatar?: string
    isVerified?: boolean
    coverPicture?: string
  }
  isOwnProfile?: boolean // Only show portfolio/sensitive data if viewing own profile
  currentUserWallet?: string // Current logged-in user's wallet for tipping
  ownedNfts?: Array<{ id: string; title: string; artworkUrl?: string }> // For NFT airdrop
  onFollow?: () => void
  onUnfollow?: () => void
  isFollowing?: boolean
  onEditProfile?: () => void
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
  ownedNfts?: Array<{ id: string; title: string; artworkUrl?: string }>
}) {
  const [activeTab, setActiveTab] = useState<'tip' | 'airdrop'>('tip')
  const [tipAmount, setTipAmount] = useState('')
  const [selectedNfts, setSelectedNfts] = useState<string[]>([])
  const [sending, setSending] = useState(false)

  if (!isOpen) return null

  const handleSendTip = async () => {
    if (!tipAmount || parseFloat(tipAmount) <= 0) return
    setSending(true)
    // TODO: Implement OGUN transfer via smart contract
    console.log(`Sending ${tipAmount} OGUN from ${senderWallet} to ${recipientWallet}`)
    setTimeout(() => {
      setSending(false)
      alert(`Sent ${tipAmount} OGUN to ${recipientName}!`)
      onClose()
    }, 1500)
  }

  const handleAirdrop = async () => {
    if (selectedNfts.length === 0) return
    setSending(true)
    // TODO: Implement NFT transfer
    console.log(`Airdropping ${selectedNfts.length} NFTs to ${recipientWallet}`)
    setTimeout(() => {
      setSending(false)
      alert(`Airdropped ${selectedNfts.length} NFT(s) to ${recipientName}!`)
      onClose()
    }, 1500)
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
                disabled={!tipAmount || parseFloat(tipAmount) <= 0 || sending}
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
                disabled={selectedNfts.length === 0 || sending}
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
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function BlurAggregatorPanel() {
  const [activeTab, setActiveTab] = useState("overview")

  const portfolioData = {
    totalValue: "24,567.89",
    change24h: "+1,234.56",
    changePercent: "+5.24%",
    nftsOwned: "47",
    floorValue: "18,234.12",
  }

  const topCollections = [
    { name: "Fidenza", floor: "12.5", volume: "456.7", change: "+12.4%" },
    { name: "Art Blocks", floor: "8.2", volume: "234.1", change: "+8.7%" },
    { name: "Chromie Squiggle", floor: "5.1", volume: "123.4", change: "-2.1%" },
    { name: "Autoglyphs", floor: "45.6", volume: "789.2", change: "+15.2%" },
  ]

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
          {/* Portfolio Value */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="metadata-section p-4">
                <div className="metadata-label">Total Value</div>
                <div className="retro-text text-xl text-white">
                  {portfolioData.totalValue} Ξ
                </div>
                <div className="text-sm text-green-400 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  {portfolioData.changePercent}
                </div>
              </div>
              <div className="metadata-section p-4">
                <div className="metadata-label">NFTs Owned</div>
                <div className="retro-text text-xl text-white">
                  {portfolioData.nftsOwned}
                </div>
                <div className="text-sm text-cyan-400">Collections: 12</div>
              </div>
            </div>
          </div>

          {/* Activity Feed */}
          <div className="space-y-3">
            <h3 className="metadata-label">Recent Activity</h3>
            <div className="space-y-2">
              {[
                { type: "buy", item: "Fidenza #234", price: "12.5 Ξ", time: "2m ago" },
                { type: "sell", item: "CryptoPunk #1234", price: "45.6 Ξ", time: "1h ago" },
                { type: "list", item: "Art Block #567", price: "8.2 Ξ", time: "3h ago" },
              ].map((activity, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 rounded-lg bg-black/20 border border-cyan-500/10"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        activity.type === "buy"
                          ? "bg-green-400"
                          : activity.type === "sell"
                            ? "bg-red-400"
                            : "bg-yellow-400"
                      } animate-pulse`}
                    />
                    <div>
                      <div className="text-sm font-medium text-white">
                        {activity.item}
                      </div>
                      <div className="retro-json text-xs">{activity.time}</div>
                    </div>
                  </div>
                  <div className="retro-text text-sm">{activity.price}</div>
                </div>
              ))}
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
  onFollow,
  onUnfollow,
  isFollowing = false,
  onEditProfile
}: ProfileHeaderProps) {
  const [showTipBucket, setShowTipBucket] = useState(false)

  const defaultUser = {
    name: "Xamã",
    username: "@xama",
    bio: "The official SoundChain account. Here is an example of what the bio should look like on the profile.",
    walletAddress: "0xf30...345",
    tracks: 25,
    followers: 3537,
    likes: 1237,
    avatar: profileAvatar,
    isVerified: true,
    coverPicture: undefined as string | undefined,
  }

  const userData = user || defaultUser

  // Format wallet address for display (full address, truncated in UI)
  const formatWalletAddress = (address: string) => {
    if (!address || address === '0x...' || address.length < 10) return 'Not connected'
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const copyAddress = () => {
    if (userData.walletAddress && userData.walletAddress !== '0x...') {
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

            {/* Profile info */}
            <div className="flex-1 space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="retro-title text-2xl lg:text-3xl">{userData.name}</h1>
                  {userData.isVerified && (
                    <div className="w-6 h-6 bg-gradient-to-r from-cyan-400 to-purple-600 rounded-full flex items-center justify-center analog-glow">
                      <div className="w-3 h-3 bg-white rounded-full" />
                    </div>
                  )}
                </div>
                <p className="retro-json text-sm">{userData.username}</p>
                <p className="text-gray-300 text-sm lg:text-base max-w-md leading-relaxed">
                  {userData.bio}
                </p>
              </div>

              {/* Real-time Stats Grid */}
              <div className="grid grid-cols-2 gap-3 lg:gap-4">
                <div className="metadata-section p-3 lg:p-4 text-center">
                  <div className="retro-text text-xl lg:text-2xl">{userData.followers.toLocaleString()}</div>
                  <div className="metadata-label text-xs">Followers</div>
                </div>
                <div className="metadata-section p-3 lg:p-4 text-center">
                  <div className="retro-text text-xl lg:text-2xl">{userData.likes.toLocaleString()}</div>
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
    </div>
  )
}
