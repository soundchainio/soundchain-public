import { useState, useEffect } from 'react'
import classNames from 'classnames'
import { getSoundChainStickers, getStickersByCategory } from 'lib/soundchainStickers'

// Types for emote APIs
interface SevenTVEmote {
  id: string
  name: string
  data: {
    animated: boolean
    host: {
      url: string
      files: Array<{ name: string; format: string }>
    }
  }
}

interface BTTVEmote {
  id: string
  code: string
  imageType: 'png' | 'gif' | 'webp'
  animated: boolean
}

interface FFZEmote {
  id: number
  name: string
  urls: { [key: string]: string }
  animated?: boolean
}

interface NormalizedEmote {
  id: string
  name: string
  url: string
  animated: boolean
  source: 'twitch' | '7tv' | 'bttv' | 'ffz' | 'kick' | 'tenor' | 'soundchain'
}

type StickerCategory = '7tv' | 'bttv' | 'ffz' | 'trending' | 'reactions' | 'music' | 'twitch' | 'kick' | 'soundchain' | 'genres' | 'crypto'

interface StickerPickerProps {
  onSelect: (stickerUrl: string, stickerName: string) => void
  theme?: 'dark' | 'light'
}

// Cache for loaded emotes (cleared on page refresh)
const emoteCache: { [key: string]: NormalizedEmote[] } = {}

// Filter out seasonal/holiday emotes
// Update this list seasonally: remove holiday keywords after the season, add new ones before
const SEASONAL_KEYWORDS = [
  // Christmas/Winter (remove after Jan 15)
  'christmas', 'xmas', 'santa', 'holiday', 'reindeer', 'snowman', 'gift', 'present',
  'mistletoe', 'ornament', 'sleigh', 'elf', 'grinch', 'rudolph', 'frosty', 'jingle',
  'noel', 'yule', 'candycane', 'stocking', 'wreath', 'nutcracker', 'festive',
  // Add more seasonal keywords as needed:
  // Halloween: 'halloween', 'spooky', 'ghost', 'witch', 'pumpkin', 'skeleton'
  // Easter: 'easter', 'bunny', 'egg'
]

const isSeasonalEmote = (name: string): boolean => {
  const lowerName = name.toLowerCase()
  return SEASONAL_KEYWORDS.some(keyword => lowerName.includes(keyword))
}

const filterSeasonalEmotes = (emotes: NormalizedEmote[]): NormalizedEmote[] => {
  return emotes.filter(emote => !isSeasonalEmote(emote.name))
}

export const StickerPicker = ({ onSelect, theme = 'dark' }: StickerPickerProps) => {
  const [activeCategory, setActiveCategory] = useState<StickerCategory>('soundchain')
  const [emotes, setEmotes] = useState<NormalizedEmote[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  const categories = [
    { id: 'soundchain' as const, label: 'SC', icon: '🎧' },
    { id: 'genres' as const, label: 'Genre', icon: '🎸' },
    { id: 'crypto' as const, label: 'Web3', icon: '💎' },
    { id: 'trending' as const, label: 'Hot', icon: '🔥' },
    { id: 'reactions' as const, label: 'React', icon: '😂' },
    { id: 'music' as const, label: 'Music', icon: '🎵' },
    { id: 'twitch' as const, label: 'Twitch', icon: '💜' },
    { id: 'kick' as const, label: 'Kick', icon: '💚' },
    { id: '7tv' as const, label: '7TV', icon: '7️⃣' },
    { id: 'bttv' as const, label: 'BTTV', icon: '🅱️' },
    { id: 'ffz' as const, label: 'FFZ', icon: '😎' },
  ]

  // Fetch 7TV Global Emotes
  const fetch7TVEmotes = async (): Promise<NormalizedEmote[]> => {
    if (emoteCache['7tv']) return emoteCache['7tv']

    try {
      const response = await fetch('https://7tv.io/v3/emote-sets/global')
      const data = await response.json()

      const normalized: NormalizedEmote[] = (data.emotes || []).map((emote: SevenTVEmote) => ({
        id: emote.id,
        name: emote.name,
        // Use default URL (no extension) - CDN serves best format for browser
        // Fallback chain in onError: default -> webp -> png
        url: `https://cdn.7tv.app/emote/${emote.id}/2x`,
        animated: emote.data?.animated || false,
        source: '7tv' as const,
      }))

      emoteCache['7tv'] = normalized
      return normalized
    } catch (error) {
      console.error('Failed to fetch 7TV emotes:', error)
      return []
    }
  }

  // Fetch BTTV Global Emotes
  const fetchBTTVEmotes = async (): Promise<NormalizedEmote[]> => {
    if (emoteCache['bttv']) return emoteCache['bttv']

    try {
      const response = await fetch('https://api.betterttv.net/3/cached/emotes/global')
      const data: BTTVEmote[] = await response.json()

      const normalized: NormalizedEmote[] = data.map((emote) => ({
        id: emote.id,
        name: emote.code,
        url: `https://cdn.betterttv.net/emote/${emote.id}/2x.${emote.imageType}`,
        animated: emote.animated || emote.imageType === 'gif',
        source: 'bttv' as const,
      }))

      emoteCache['bttv'] = normalized
      return normalized
    } catch (error) {
      console.error('Failed to fetch BTTV emotes:', error)
      return []
    }
  }

  // Fetch FFZ Global Emotes
  const fetchFFZEmotes = async (): Promise<NormalizedEmote[]> => {
    if (emoteCache['ffz']) return emoteCache['ffz']

    try {
      const response = await fetch('https://api.frankerfacez.com/v1/set/global')
      const data = await response.json()

      const allEmotes: NormalizedEmote[] = []

      // FFZ returns sets, we need to flatten them
      for (const setId of Object.keys(data.sets || {})) {
        const set = data.sets[setId]
        for (const emote of set.emoticons || []) {
          allEmotes.push({
            id: String(emote.id),
            name: emote.name,
            url: emote.urls['2'] || emote.urls['1'] || Object.values(emote.urls)[0] as string,
            animated: emote.animated || false,
            source: 'ffz' as const,
          })
        }
      }

      emoteCache['ffz'] = allEmotes
      return allEmotes
    } catch (error) {
      console.error('Failed to fetch FFZ emotes:', error)
      return []
    }
  }

  // Fetch Twitch Global Emotes (curated popular emotes via static CDN)
  const fetchTwitchEmotes = async (): Promise<NormalizedEmote[]> => {
    if (emoteCache['twitch']) return emoteCache['twitch']

    // Popular Twitch global emote IDs (these are stable Twitch emote IDs)
    const twitchEmotes = [
      { id: '25', name: 'Kappa' },
      { id: '1', name: ':)' },
      { id: '2', name: ':(' },
      { id: '7', name: 'B)' },
      { id: '8', name: 'O_o' },
      { id: '86', name: 'BibleThump' },
      { id: '88', name: 'PogChamp' },
      { id: '354', name: '4Head' },
      { id: '425618', name: 'LUL' },
      { id: '30259', name: 'HeyGuys' },
      { id: '28', name: 'MrDestructoid' },
      { id: '36', name: 'PJSalt' },
      { id: '41', name: 'Kreygasm' },
      { id: '58765', name: 'NotLikeThis' },
      { id: '68856', name: 'WutFace' },
      { id: '33', name: 'DansGame' },
      { id: '114836', name: 'CoolStoryBob' },
      { id: '425688', name: 'SeemsGood' },
      { id: '81274', name: 'VoHiYo' },
      { id: '425614', name: 'FailFish' },
      { id: '46881', name: 'AngelThump' },
      { id: '80393', name: 'TriHard' },
      { id: '86', name: 'BibleThump' },
      { id: '120232', name: 'CorgiDerp' },
      { id: '52', name: 'SMOrc' },
      { id: '244', name: 'FrankerZ' },
      { id: '167', name: 'OSFrog' },
      { id: '65', name: 'SwiftRage' },
      { id: '138', name: 'ResidentSleeper' },
      { id: '55338', name: 'KonCha' },
      { id: '160401', name: 'TPFufun' },
      { id: '160395', name: 'GunRun' },
      { id: '425670', name: 'PJSugar' },
      { id: '160394', name: 'DogFace' },
      { id: '102242', name: 'VoteYea' },
      { id: '102243', name: 'VoteNay' },
      { id: '160392', name: 'CarlSmile' },
      { id: '28087', name: 'WutFace' },
      { id: '191762', name: 'bleedPurple' },
    ]

    const normalized: NormalizedEmote[] = twitchEmotes.map(emote => ({
      id: `twitch-${emote.id}`,
      name: emote.name,
      url: `https://static-cdn.jtvnw.net/emoticons/v2/${emote.id}/default/dark/2.0`,
      animated: false,
      source: 'twitch' as const,
    }))

    emoteCache['twitch'] = normalized
    return normalized
  }

  // Fetch Kick-style emotes (popular streaming emotes from 7TV)
  // Note: Kick.com doesn't have a public emote CDN, so we use 7TV emotes popular with Kick streamers
  const fetchKickEmotes = async (): Promise<NormalizedEmote[]> => {
    if (emoteCache['kick']) return emoteCache['kick']

    try {
      // Fetch popular emotes from multiple Kick streamer 7TV sets
      const setIds = [
        '01GFXJ8WK0000014MXH9PNH9F7', // Popular Kick streamer set
        '01GG9NZS6G000CXPT2B0TZFZ3J', // Additional popular set
      ]

      const allEmotes: NormalizedEmote[] = []

      for (const setId of setIds) {
        try {
          const response = await fetch(`https://7tv.io/v3/emote-sets/${setId}`)
          const data = await response.json()

          if (data.emotes) {
            for (const emote of data.emotes.slice(0, 25)) {
              allEmotes.push({
                id: `kick-${emote.id}`,
                name: emote.name,
                url: `https://cdn.7tv.app/emote/${emote.id}/2x`,
                animated: emote.data?.animated || false,
                source: 'kick' as const,
              })
            }
          }
        } catch (e) {
          // Skip failed set
        }
      }

      // Add some curated popular streaming emotes
      const curatedKickEmotes = [
        { id: '60ae958e229664e8667aea38', name: 'KEKW' },
        { id: '60b04b4a77ccd81f2b77d67d', name: 'LULW' },
        { id: '60b0d3ec8ed8b373e421e7a7', name: 'OMEGALUL' },
        { id: '60aec9186d0b8c60ac0be7c0', name: 'catJAM' },
        { id: '60ae8cac229664e8667ae5a8', name: 'pepeD' },
      ]

      const curated = curatedKickEmotes.map(e => ({
        id: `kick-curated-${e.id}`,
        name: e.name,
        url: `https://cdn.7tv.app/emote/${e.id}/2x`,
        animated: true,
        source: 'kick' as const,
      }))

      const combined = [...curated, ...allEmotes]
      emoteCache['kick'] = combined
      return combined
    } catch (error) {
      console.error('Failed to fetch Kick emotes:', error)
      return []
    }
  }

  // Fetch 7TV Trending/Popular emotes from multiple emote sets
  const fetch7TVTrending = async (): Promise<NormalizedEmote[]> => {
    if (emoteCache['7tv-trending']) return emoteCache['7tv-trending']

    try {
      // Fetch from multiple popular 7TV emote sets
      const setIds = [
        '01GG9NZS6G000CXPT2B0TZFZ3J', // NymN's set
        '01FDMJPSF8000E7SY3FBPS1V6K', // xQc's set
        '01H9E8G4MR0004NYG5BCPE3M2Y', // Popular set
      ]

      const allEmotes: NormalizedEmote[] = []

      for (const setId of setIds) {
        try {
          const response = await fetch(`https://7tv.io/v3/emote-sets/${setId}`)
          const data = await response.json()

          if (data.emotes) {
            for (const emote of data.emotes.slice(0, 30)) {
              allEmotes.push({
                id: `trend-${emote.id}`,
                name: emote.name,
                url: `https://cdn.7tv.app/emote/${emote.id}/2x`,
                animated: emote.data?.animated || false,
                source: '7tv' as const,
              })
            }
          }
        } catch (e) {
          // Skip failed set
        }
      }

      emoteCache['7tv-trending'] = allEmotes
      return allEmotes
    } catch (error) {
      console.error('Failed to fetch 7TV trending:', error)
      return []
    }
  }

  // Popular reaction emotes (curated from 7TV)
  const getReactionEmotes = (): NormalizedEmote[] => {
    // Popular reaction emote IDs from 7TV
    const reactions = [
      { id: '60ae958e229664e8667aea38', name: 'KEKW' },
      { id: '60b04b4a77ccd81f2b77d67d', name: 'LULW' },
      { id: '60aefc43ff8a9a15a6de5847', name: 'PepeLaugh' },
      { id: '60ae3fd1229664e8667ab074', name: 'Sadge' },
      { id: '60af9fdde5e3c23f8a6dea93', name: 'Copium' },
      { id: '60af1b9eaa0d72dc39f1ea0f', name: 'Aware' },
      { id: '60b0d3ec8ed8b373e421e7a7', name: 'OMEGALUL' },
      { id: '60b0d3c3daa8fb57cd62c5db', name: 'monkaS' },
      { id: '60b0d3d4a5de6cf21b5ea84e', name: 'PogU' },
      { id: '60b0d3a7a5de6cf21b5ea83b', name: 'FeelsGoodMan' },
      { id: '60b0d3b5a5de6cf21b5ea842', name: 'FeelsBadMan' },
      { id: '60afe3c580df1e6b58fd7f3f', name: 'NODDERS' },
      { id: '60aec9186d0b8c60ac0be7c0', name: 'catJAM' },
      { id: '60af3bfc77ccd81f2b76a2c3', name: 'PauseChamp' },
      { id: '60b0d53e77ccd81f2b78c1c0', name: 'peepoHappy' },
      { id: '60b0d577f0e6f5574632aad8', name: 'peepoSad' },
      { id: '60af2c40aa0d72dc39f1c3e4', name: 'Clap' },
      { id: '60b04bc4daa8fb57cd61b38c', name: 'WAYTOODANK' },
      { id: '60af69b37e08e07de9d40f04', name: 'Pepega' },
      { id: '60ae4aa5229664e8667ab8ef', name: 'HYPERS' },
      { id: '60ae4dc1229664e8667ab9d9', name: 'PepeHands' },
      { id: '60af14f4e5e3c23f8a6dd802', name: 'WideHard' },
      { id: '60af3c7e229664e8667ac2eb', name: 'Prayge' },
      { id: '60b0d3f1daa8fb57cd62c5e6', name: 'EZ' },
      { id: '60b0d43b77ccd81f2b78ba37', name: 'forsenCD' },
      { id: '60af2d01aa0d72dc39f1c470', name: 'CoolCat' },
      { id: '60b0d42e77ccd81f2b78ba2d', name: 'monkaW' },
      { id: '60af3d5ee5e3c23f8a6ddc9e', name: 'HACKERMANS' },
      { id: '60b0d3df77ccd81f2b78b963', name: 'TriHard' },
      { id: '60ae8cac229664e8667ae5a8', name: 'pepeD' },
    ]

    return reactions.map(r => ({
      id: `react-${r.id}`,
      name: r.name,
      url: `https://cdn.7tv.app/emote/${r.id}/2x`,
      animated: true,
      source: '7tv' as const,
    }))
  }

  // Music-themed emotes
  const getMusicEmotes = (): NormalizedEmote[] => {
    // Popular music/vibe emote IDs from 7TV
    const musicEmotes = [
      { id: '60aec9186d0b8c60ac0be7c0', name: 'catJAM' },
      { id: '60ae8cac229664e8667ae5a8', name: 'pepeD' },
      { id: '60afe3c580df1e6b58fd7f3f', name: 'NODDERS' },
      { id: '60af2c40aa0d72dc39f1c3e4', name: 'Clap' },
      { id: '60b076aea64e9d892a82d9f1', name: 'BOOBA' },
      { id: '60b0d53e77ccd81f2b78c1c0', name: 'peepoHappy' },
      { id: '60af8dace5e3c23f8a6de1ec', name: 'FeelsOkayMan' },
      { id: '60b0d3ec8ed8b373e421e7a7', name: 'OMEGALUL' },
      { id: '60b11aab6a76e2db2da56f59', name: 'peepoClap' },
      { id: '60ae4aa5229664e8667ab8ef', name: 'HYPERS' },
      { id: '60b0d3a7a5de6cf21b5ea83b', name: 'FeelsGoodMan' },
      { id: '60af3c7e229664e8667ac2eb', name: 'Prayge' },
      { id: '60b04b4a77ccd81f2b77d67d', name: 'LULW' },
      { id: '60af14f4e5e3c23f8a6dd802', name: 'WideHard' },
      { id: '60ae958e229664e8667aea38', name: 'KEKW' },
      { id: '60b0d3f1daa8fb57cd62c5e6', name: 'EZ' },
      { id: '60aefc43ff8a9a15a6de5847', name: 'PepeLaugh' },
      { id: '60b0d43b77ccd81f2b78ba37', name: 'forsenCD' },
      { id: '60af3bfc77ccd81f2b76a2c3', name: 'PauseChamp' },
      { id: '60b0d3d4a5de6cf21b5ea84e', name: 'PogU' },
    ]

    return musicEmotes.map(e => ({
      id: `music-${e.id}`,
      name: e.name,
      url: `https://cdn.7tv.app/emote/${e.id}/2x`,
      animated: true,
      source: '7tv' as const,
    }))
  }

  // Load emotes when category changes
  useEffect(() => {
    const loadEmotes = async () => {
      setLoading(true)

      try {
        let loadedEmotes: NormalizedEmote[] = []

        switch (activeCategory) {
          case 'soundchain':
            // SoundChain branded stickers (brand + badges)
            loadedEmotes = [
              ...getStickersByCategory('brand'),
              ...getStickersByCategory('badge'),
            ]
            break
          case 'genres':
            // Genre-specific stickers
            loadedEmotes = getStickersByCategory('genre')
            break
          case 'crypto':
            // Web3/Crypto vibes
            loadedEmotes = getStickersByCategory('crypto')
            break
          case '7tv':
            loadedEmotes = await fetch7TVEmotes()
            break
          case 'bttv':
            loadedEmotes = await fetchBTTVEmotes()
            break
          case 'ffz':
            loadedEmotes = await fetchFFZEmotes()
            break
          case 'twitch':
            loadedEmotes = await fetchTwitchEmotes()
            break
          case 'kick':
            loadedEmotes = await fetchKickEmotes()
            break
          case 'reactions':
            loadedEmotes = getReactionEmotes()
            break
          case 'music':
            loadedEmotes = getMusicEmotes()
            break
          case 'trending':
            // Load a massive mix of popular animated emotes from all sources
            const [sevenTV, bttv, ffz, trending, twitchGlobal, kickEmotesData] = await Promise.all([
              fetch7TVEmotes(),
              fetchBTTVEmotes(),
              fetchFFZEmotes(),
              fetch7TVTrending(),
              fetchTwitchEmotes(),
              fetchKickEmotes(),
            ])

            // Prioritize animated emotes and mix from all sources
            const animated7tv = sevenTV.filter(e => e.animated).slice(0, 20)
            const animatedBttv = bttv.filter(e => e.animated).slice(0, 20)
            const animatedFfz = ffz.filter(e => e.animated).slice(0, 10)
            const trendingEmotes = trending.filter(e => e.animated).slice(0, 20)
            const animatedKick = kickEmotesData.filter(e => e.animated).slice(0, 10)

            // Also get some popular static ones including Twitch classics
            const static7tv = sevenTV.filter(e => !e.animated).slice(0, 8)
            const staticBttv = bttv.filter(e => !e.animated).slice(0, 8)
            const twitchClassics = twitchGlobal.slice(0, 15) // Kappa, LUL, PogChamp etc.
            const staticKick = kickEmotesData.filter(e => !e.animated).slice(0, 5)

            loadedEmotes = [...trendingEmotes, ...animated7tv, ...animatedBttv, ...animatedFfz, ...animatedKick, ...twitchClassics, ...static7tv, ...staticBttv, ...staticKick]
            break
        }

        // Filter out seasonal/holiday emotes
        setEmotes(filterSeasonalEmotes(loadedEmotes))
      } catch (error) {
        console.error('Failed to load emotes:', error)
        setEmotes([])
      } finally {
        setLoading(false)
      }
    }

    loadEmotes()
  }, [activeCategory])

  // Filter emotes by search query
  const filteredEmotes = searchQuery
    ? emotes.filter(e => e.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : emotes

  const handleEmoteClick = (emote: NormalizedEmote) => {
    // Pass both URL and name for rendering in the post/comment
    onSelect(emote.url, emote.name)
  }

  return (
    <div
      className={classNames('w-full max-w-full sm:max-w-[384px] rounded-xl shadow-2xl border', {
        'bg-neutral-900 text-white border-neutral-700': theme === 'dark',
        'bg-white text-gray-900 border-gray-200': theme === 'light',
      })}
    >
      {/* Header with Search */}
      <div className="p-3 border-b border-neutral-700">
        <input
          type="text"
          placeholder="Search emotes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={classNames('w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500', {
            'bg-neutral-800 text-white placeholder-neutral-500': theme === 'dark',
            'bg-gray-100 text-gray-900 placeholder-gray-400': theme === 'light',
          })}
        />
      </div>

      {/* Category Tabs - scrollable on mobile */}
      <div className="flex border-b border-neutral-700 overflow-x-auto scrollbar-hide">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => setActiveCategory(category.id)}
            className={classNames('flex-shrink-0 px-2 sm:px-3 py-2.5 text-[10px] sm:text-xs font-medium transition-all whitespace-nowrap', {
              'bg-cyan-500/20 text-cyan-400 border-b-2 border-cyan-400': activeCategory === category.id,
              'text-neutral-400 hover:bg-neutral-800 hover:text-white': activeCategory !== category.id && theme === 'dark',
              'text-gray-500 hover:bg-gray-50 hover:text-gray-900': activeCategory !== category.id && theme === 'light',
            })}
          >
            <span className="mr-0.5 sm:mr-1">{category.icon}</span>
            {category.label}
          </button>
        ))}
      </div>

      {/* Emotes Grid - shorter on mobile for better fit */}
      <div className="h-48 sm:h-80 overflow-y-auto p-2">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-neutral-400">Loading emotes...</span>
            </div>
          </div>
        ) : filteredEmotes.length === 0 ? (
          <div className="flex items-center justify-center h-full text-neutral-500">
            {searchQuery ? 'No emotes found' : 'No emotes available'}
          </div>
        ) : (
          <div className="grid grid-cols-8 gap-0.5">
            {filteredEmotes.map((emote) => (
              <button
                key={`${emote.source}-${emote.id}`}
                onClick={() => handleEmoteClick(emote)}
                className={classNames(
                  'relative flex items-center justify-center p-1 rounded-lg transition-all hover:scale-110 group',
                  {
                    'hover:bg-neutral-800': theme === 'dark',
                    'hover:bg-gray-100': theme === 'light',
                  }
                )}
                title={`${emote.name} (${emote.source.toUpperCase()}${emote.animated ? ' - Animated' : ''})`}
              >
                <img
                  src={emote.url}
                  alt={emote.name}
                  className="w-7 h-7 object-contain"
                  loading="lazy"
                  onError={(e) => {
                    // Fallback chain: default -> webp -> gif -> png -> text
                    const img = e.target as HTMLImageElement
                    const url = img.src
                    if (!url.includes('.webp') && !url.includes('.gif') && !url.includes('.png')) {
                      // Default URL failed, try webp
                      img.src = url + '.webp'
                    } else if (url.includes('.webp')) {
                      // webp failed, try gif
                      img.src = url.replace('.webp', '.gif')
                    } else if (url.includes('.gif')) {
                      // gif failed, try png
                      img.src = url.replace('.gif', '.png')
                    } else {
                      // All formats failed - show text fallback
                      img.style.display = 'none'
                      img.parentElement?.classList.add('bg-neutral-700', 'text-[8px]', 'text-cyan-400')
                      if (img.parentElement) {
                        img.parentElement.textContent = emote.name.slice(0, 4)
                      }
                    }
                  }}
                />
                {/* Animated indicator */}
                {emote.animated && (
                  <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse" />
                )}
                {/* Tooltip on hover */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-black/90 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                  {emote.name}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-2 text-[10px] text-neutral-500 border-t border-neutral-700 flex items-center justify-between">
        <span>
          {filteredEmotes.length} emotes
          {filteredEmotes.filter(e => e.animated).length > 0 && (
            <span className="ml-1">
              • <span className="text-cyan-400">{filteredEmotes.filter(e => e.animated).length} animated</span>
            </span>
          )}
        </span>
        <span className="flex items-center gap-1">
          🎧 SC • 💜 Twitch • 💚 Kick • 7TV
        </span>
      </div>
    </div>
  )
}
