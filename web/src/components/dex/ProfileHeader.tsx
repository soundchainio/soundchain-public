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
  Zap
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

export function ProfileHeader({ user, isOwnProfile = false }: ProfileHeaderProps) {
  const defaultUser = {
    name: "Xamã",
    username: "@xama",
    bio: "The official SoundChain account. Here is an example of what the bio should look like on the profile.",
    walletAddress: "0xf30...345",
    tracks: 25,
    followers: 3537,
    likes: 1237,
    avatar: profileAvatar,
    isVerified: true
  }

  const userData = user || defaultUser

  const copyAddress = () => {
    navigator.clipboard.writeText(userData.walletAddress)
    alert('Address copied!')
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

              {/* Action buttons */}
              <div className="flex flex-wrap gap-3">
                <Button className="retro-button">
                  <Users className="w-4 h-4 mr-2" />
                  Follow
                </Button>
                <Button variant="outline" className="border-purple-500/50 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Message
                </Button>
                <Button variant="outline" className="border-cyan-500/50 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300">
                  <Share2 className="w-4 h-4" />
                </Button>
              </div>

              {/* Wallet address */}
              <Card className="retro-card p-3 w-fit">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-gradient-to-r from-orange-400 to-red-500 rounded-lg flex items-center justify-center shadow-lg">
                    <Wallet className="w-3 h-3 text-white" />
                  </div>
                  <span className="retro-json text-sm">{userData.walletAddress}</span>
                  <Button variant="ghost" size="sm" onClick={copyAddress} className="hover:bg-cyan-500/20 p-1">
                    <Copy className="w-3 h-3" />
                  </Button>
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
    </div>
  )
}
