/**
 * RadioNFTCard — Pokemon-style trading card for the currently playing track
 * Floats to the left of the radio sphere. Tap to expand metadata accordion.
 *
 * 8K quality aesthetic: holographic borders, glass morphism, neon glow
 */

import React, { useState, useEffect } from 'react'
import { Music, Disc3, ExternalLink, ChevronDown, ChevronUp, Coins, Users, Tag, Hash, Layers, Sparkles, Shield } from 'lucide-react'

interface RadioTrack {
  id: string
  title: string
  artist: string
  album?: string
  description?: string
  artwork_url?: string
  stream_url?: string
  play_count: number
  scid?: string
  is_nft: boolean
  genres?: string[]
  editionCount?: number
  owner?: {
    handle: string
    display_name: string
    avatar?: string
  } | null
  licensing?: {
    type: string
    ogun_enabled: boolean
    streaming_rewards: boolean
  }
}

interface RadioNFTCardProps {
  track: RadioTrack | null
  isPlaying: boolean
}

export function RadioNFTCard({ track, isPlaying }: RadioNFTCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [isFlipped, setIsFlipped] = useState(false)
  const [cardVisible, setCardVisible] = useState(false)

  // Animate card entrance on track change
  useEffect(() => {
    if (track) {
      setCardVisible(false)
      setExpanded(false)
      setIsFlipped(false)
      const timer = setTimeout(() => setCardVisible(true), 100)
      return () => clearTimeout(timer)
    }
  }, [track?.id])

  if (!track) return null

  const isNft = track.is_nft
  const editions = track.editionCount || 1
  const hasRewards = track.licensing?.streaming_rewards
  const rarityTier = editions <= 1 ? 'LEGENDARY' : editions <= 5 ? 'EPIC' : editions <= 25 ? 'RARE' : editions <= 100 ? 'UNCOMMON' : 'COMMON'
  const rarityColor = {
    LEGENDARY: 'from-yellow-400 via-orange-500 to-red-500',
    EPIC: 'from-purple-400 via-pink-500 to-red-400',
    RARE: 'from-cyan-400 via-blue-500 to-purple-500',
    UNCOMMON: 'from-green-400 via-emerald-500 to-teal-500',
    COMMON: 'from-gray-400 via-gray-500 to-gray-600',
  }[rarityTier]
  const rarityGlow = {
    LEGENDARY: 'shadow-[0_0_30px_rgba(251,191,36,0.4),0_0_60px_rgba(251,191,36,0.15)]',
    EPIC: 'shadow-[0_0_30px_rgba(168,85,247,0.4),0_0_60px_rgba(168,85,247,0.15)]',
    RARE: 'shadow-[0_0_30px_rgba(34,211,238,0.4),0_0_60px_rgba(34,211,238,0.15)]',
    UNCOMMON: 'shadow-[0_0_20px_rgba(74,222,128,0.3)]',
    COMMON: 'shadow-[0_0_15px_rgba(156,163,175,0.2)]',
  }[rarityTier]

  return (
    <div
      className={`transition-all duration-700 ease-out ${
        cardVisible ? 'opacity-100 translate-x-0 scale-100' : 'opacity-0 -translate-x-8 scale-90'
      }`}
    >
      {/* Card Container */}
      <div
        onClick={() => setExpanded(!expanded)}
        className={`
          relative cursor-pointer select-none
          w-[100px] sm:w-[120px] md:w-[160px]
          rounded-xl overflow-hidden
          border border-white/20
          backdrop-blur-xl
          ${rarityGlow}
          hover:scale-105 active:scale-95
          transition-all duration-300
        `}
        style={{
          background: 'linear-gradient(145deg, rgba(0,0,0,0.85) 0%, rgba(10,15,30,0.9) 50%, rgba(0,0,0,0.85) 100%)',
        }}
      >
        {/* Holographic border effect */}
        <div
          className="absolute inset-0 rounded-xl pointer-events-none"
          style={{
            background: `linear-gradient(135deg, transparent 30%, rgba(255,255,255,0.08) 50%, transparent 70%)`,
            animation: isPlaying ? 'shimmer 3s ease-in-out infinite' : 'none',
          }}
        />

        {/* Rarity bar at top */}
        <div className={`h-[2px] bg-gradient-to-r ${rarityColor}`} />

        {/* Artwork */}
        <div className="relative aspect-square overflow-hidden">
          {track.artwork_url ? (
            <img
              src={track.artwork_url}
              alt={track.title}
              className="w-full h-full object-cover"
              loading="eager"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-purple-900/60 to-cyan-900/60 flex items-center justify-center">
              <Music className="w-8 h-8 text-white/30" />
            </div>
          )}

          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

          {/* NFT Badge */}
          {isNft && (
            <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 bg-gradient-to-r from-yellow-500 to-orange-500 text-black text-[7px] font-black rounded-md shadow-[0_0_10px_rgba(251,191,36,0.5)]">
              NFT
            </div>
          )}

          {/* SCID Badge */}
          {track.scid && (
            <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-black/60 backdrop-blur-sm text-cyan-400 text-[6px] font-mono rounded-md border border-cyan-500/30">
              {track.scid}
            </div>
          )}

          {/* Rarity Badge */}
          <div className={`absolute bottom-1.5 left-1.5 px-1.5 py-0.5 bg-gradient-to-r ${rarityColor} text-white text-[6px] font-black rounded-md tracking-wider`}>
            {rarityTier}
          </div>

          {/* Edition Count */}
          {editions > 1 && (
            <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 bg-black/60 backdrop-blur-sm text-white text-[7px] font-bold rounded-md border border-white/20">
              ×{editions}
            </div>
          )}

          {/* Playing indicator */}
          {isPlaying && (
            <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex items-center gap-[2px]">
              {[1,2,3,4,5].map(i => (
                <div
                  key={i}
                  className="w-[2px] bg-green-400 rounded-full shadow-[0_0_4px_rgba(74,222,128,0.8)]"
                  style={{
                    height: `${6 + Math.random() * 8}px`,
                    animation: `eqBar 0.${3 + i}s ease-in-out infinite alternate`,
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Card Info */}
        <div className="p-2">
          <h3 className="text-[10px] font-bold text-white leading-tight line-clamp-1 mb-0.5">
            {track.title}
          </h3>
          <p className="text-[8px] text-gray-400 line-clamp-1 mb-1">
            {track.artist}
          </p>

          {/* Stats row */}
          <div className="flex items-center justify-between text-[7px] text-gray-500">
            <span className="flex items-center gap-0.5">
              <Disc3 className="w-2.5 h-2.5" />
              {track.play_count} plays
            </span>
            {hasRewards && (
              <span className="flex items-center gap-0.5 text-green-400">
                <Coins className="w-2.5 h-2.5" />
                OGUN
              </span>
            )}
          </div>

          {/* Expand indicator */}
          <div className="flex items-center justify-center mt-1.5 text-[7px] text-gray-600">
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </div>
        </div>

        {/* Rarity bar at bottom */}
        <div className={`h-[2px] bg-gradient-to-r ${rarityColor}`} />
      </div>

      {/* Expanded Accordion Modal */}
      {expanded && (
        <div
          className={`
            mt-2 w-[100px] sm:w-[120px] md:w-[160px]
            rounded-xl overflow-hidden
            border border-white/10
            backdrop-blur-xl
            ${rarityGlow}
            transition-all duration-300
            animate-in slide-in-from-top-2
          `}
          style={{
            background: 'linear-gradient(180deg, rgba(0,0,0,0.9) 0%, rgba(5,10,25,0.95) 100%)',
          }}
        >
          {/* Metadata sections */}
          <div className="divide-y divide-white/5">
            {/* Description */}
            {track.description && (
              <div className="p-2">
                <div className="text-[7px] text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Tag className="w-2.5 h-2.5" /> About
                </div>
                <p className="text-[8px] text-gray-300 leading-relaxed line-clamp-4">
                  {track.description}
                </p>
              </div>
            )}

            {/* Edition Details */}
            <div className="p-2">
              <div className="text-[7px] text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Layers className="w-2.5 h-2.5" /> Edition
              </div>
              <div className="grid grid-cols-2 gap-1">
                <div className="bg-white/5 rounded-md p-1.5 text-center">
                  <div className="text-[10px] font-bold text-white">{editions}</div>
                  <div className="text-[6px] text-gray-500">Minted</div>
                </div>
                <div className={`bg-gradient-to-br ${rarityColor} bg-opacity-10 rounded-md p-1.5 text-center`} style={{ background: `linear-gradient(135deg, rgba(0,0,0,0.8), rgba(0,0,0,0.6))` }}>
                  <div className="text-[10px] font-bold text-white">{rarityTier}</div>
                  <div className="text-[6px] text-gray-500">Rarity</div>
                </div>
              </div>
            </div>

            {/* On-Chain */}
            {track.scid && (
              <div className="p-2">
                <div className="text-[7px] text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Shield className="w-2.5 h-2.5" /> On-Chain
                </div>
                <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-md p-1.5">
                  <div className="text-[7px] text-cyan-400 font-mono break-all">{track.scid}</div>
                  <div className="text-[6px] text-gray-500 mt-0.5">Polygon • IPFS Verified</div>
                </div>
              </div>
            )}

            {/* Rewards */}
            {hasRewards && (
              <div className="p-2">
                <div className="text-[7px] text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" /> Rewards
                </div>
                <div className="bg-green-500/5 border border-green-500/20 rounded-md p-1.5">
                  <div className="flex items-center gap-1">
                    <Coins className="w-3 h-3 text-green-400" />
                    <span className="text-[8px] text-green-400 font-bold">OGUN Streaming Rewards</span>
                  </div>
                  <div className="text-[6px] text-gray-500 mt-0.5">70% Creator • 30% Listener</div>
                </div>
              </div>
            )}

            {/* Genres */}
            {track.genres && track.genres.length > 0 && (
              <div className="p-2">
                <div className="text-[7px] text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Hash className="w-2.5 h-2.5" /> Genres
                </div>
                <div className="flex flex-wrap gap-1">
                  {track.genres.map(g => (
                    <span key={g} className="px-1.5 py-0.5 bg-purple-500/10 border border-purple-500/20 rounded-full text-[7px] text-purple-300">
                      {g.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* View Full Details Link */}
            <div className="p-2">
              <a
                href={`/dex/track/${track.id}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-1.5 w-full py-1.5 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 rounded-lg text-[8px] text-cyan-400 font-bold hover:from-cyan-500/30 hover:to-purple-500/30 transition-all"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="w-3 h-3" />
                View Full Details
              </a>
            </div>
          </div>
        </div>
      )}

      {/* CSS for animations */}
      <style jsx global>{`
        @keyframes shimmer {
          0%, 100% { opacity: 0; }
          50% { opacity: 1; }
        }
        @keyframes eqBar {
          from { height: 3px; }
          to { height: 12px; }
        }
      `}</style>
    </div>
  )
}
