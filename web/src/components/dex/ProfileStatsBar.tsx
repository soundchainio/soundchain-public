import React from 'react'
import { TrendingUp, Users, Music, Coins, BarChart2 } from 'lucide-react'

interface ProfileStatsBarProps {
  stats: {
    itemCount?: number
    floorPrice?: string
    totalVolume?: string
    owners?: number
    listedCount?: number
    uniqueOwners?: number
    totalStreams?: number
    totalEarnings?: string
  }
  isArtistProfile?: boolean
}

export const ProfileStatsBar: React.FC<ProfileStatsBarProps> = ({ stats, isArtistProfile = false }) => {
  const formatNumber = (num: number | undefined) => {
    if (!num) return '0'
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toLocaleString()
  }

  return (
    <div className="bg-white/5 border-y border-white/5">
      <div className="max-w-screen-2xl mx-auto px-4 lg:px-6">
        <div className="flex items-center gap-6 py-3 overflow-x-auto hide-scrollbar">
          {/* Items / Tracks */}
          <div className="flex items-center gap-2 min-w-fit">
            <Music className="w-4 h-4 text-gray-500" />
            <div>
              <p className="text-sm font-semibold text-white">{formatNumber(stats.itemCount)}</p>
              <p className="text-[10px] text-gray-500">{isArtistProfile ? 'tracks' : 'items'}</p>
            </div>
          </div>

          {/* Floor Price */}
          {stats.floorPrice && (
            <div className="flex items-center gap-2 min-w-fit">
              <Coins className="w-4 h-4 text-gray-500" />
              <div>
                <p className="text-sm font-semibold text-white">{stats.floorPrice}</p>
                <p className="text-[10px] text-gray-500">floor</p>
              </div>
            </div>
          )}

          {/* Total Volume */}
          {stats.totalVolume && (
            <div className="flex items-center gap-2 min-w-fit">
              <BarChart2 className="w-4 h-4 text-gray-500" />
              <div>
                <p className="text-sm font-semibold text-white">{stats.totalVolume}</p>
                <p className="text-[10px] text-gray-500">volume</p>
              </div>
            </div>
          )}

          {/* Owners / Unique Collectors */}
          {(stats.owners || stats.uniqueOwners) && (
            <div className="flex items-center gap-2 min-w-fit">
              <Users className="w-4 h-4 text-gray-500" />
              <div>
                <p className="text-sm font-semibold text-white">{formatNumber(stats.owners || stats.uniqueOwners)}</p>
                <p className="text-[10px] text-gray-500">{isArtistProfile ? 'collectors' : 'owners'}</p>
              </div>
            </div>
          )}

          {/* Total Streams (for artists) */}
          {isArtistProfile && stats.totalStreams && (
            <div className="flex items-center gap-2 min-w-fit">
              <TrendingUp className="w-4 h-4 text-gray-500" />
              <div>
                <p className="text-sm font-semibold text-white">{formatNumber(stats.totalStreams)}</p>
                <p className="text-[10px] text-gray-500">streams</p>
              </div>
            </div>
          )}

          {/* Listed */}
          {stats.listedCount !== undefined && (
            <div className="flex items-center gap-2 min-w-fit">
              <div className="w-1.5 h-1.5 bg-green-400 rounded-full" />
              <div>
                <p className="text-sm font-semibold text-white">{formatNumber(stats.listedCount)}</p>
                <p className="text-[10px] text-gray-500">listed</p>
              </div>
            </div>
          )}

          {/* Total Earnings (for artists) */}
          {isArtistProfile && stats.totalEarnings && (
            <div className="flex items-center gap-2 min-w-fit ml-auto">
              <div className="px-3 py-1.5 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-lg border border-cyan-500/30">
                <p className="text-sm font-semibold text-cyan-400">{stats.totalEarnings} OGUN</p>
                <p className="text-[10px] text-gray-500">earned</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ProfileStatsBar
