import { useState, useEffect } from 'react'
import classNames from 'classnames'

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
  source: 'twitch' | '7tv' | 'bttv' | 'ffz' | 'kick'
}

type StickerCategory = '7tv' | 'bttv' | 'ffz' | 'trending'

interface StickerPickerProps {
  onSelect: (stickerUrl: string, stickerName: string) => void
  theme?: 'dark' | 'light'
}

// Cache for loaded emotes
const emoteCache: { [key: string]: NormalizedEmote[] } = {}

export const StickerPicker = ({ onSelect, theme = 'dark' }: StickerPickerProps) => {
  const [activeCategory, setActiveCategory] = useState<StickerCategory>('trending')
  const [emotes, setEmotes] = useState<NormalizedEmote[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  const categories = [
    { id: 'trending' as const, label: 'Trending', icon: '🔥' },
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
        url: `https://cdn.7tv.app/emote/${emote.id}/2x.webp`,
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

  // Load emotes when category changes
  useEffect(() => {
    const loadEmotes = async () => {
      setLoading(true)

      try {
        let loadedEmotes: NormalizedEmote[] = []

        switch (activeCategory) {
          case '7tv':
            loadedEmotes = await fetch7TVEmotes()
            break
          case 'bttv':
            loadedEmotes = await fetchBTTVEmotes()
            break
          case 'ffz':
            loadedEmotes = await fetchFFZEmotes()
            break
          case 'trending':
            // Load a mix of popular animated emotes from all sources
            const [sevenTV, bttv, ffz] = await Promise.all([
              fetch7TVEmotes(),
              fetchBTTVEmotes(),
              fetchFFZEmotes(),
            ])

            // Prioritize animated emotes and mix from all sources
            const animated7tv = sevenTV.filter(e => e.animated).slice(0, 15)
            const animatedBttv = bttv.filter(e => e.animated).slice(0, 15)
            const animatedFfz = ffz.filter(e => e.animated).slice(0, 10)

            // Also get some popular static ones
            const static7tv = sevenTV.filter(e => !e.animated).slice(0, 5)
            const staticBttv = bttv.filter(e => !e.animated).slice(0, 5)

            loadedEmotes = [...animated7tv, ...animatedBttv, ...animatedFfz, ...static7tv, ...staticBttv]
            break
        }

        setEmotes(loadedEmotes)
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
      className={classNames('w-full max-w-[384px] rounded-xl shadow-2xl border', {
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

      {/* Category Tabs */}
      <div className="flex border-b border-neutral-700">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => setActiveCategory(category.id)}
            className={classNames('flex-1 px-3 py-2.5 text-xs font-medium transition-all', {
              'bg-cyan-500/20 text-cyan-400 border-b-2 border-cyan-400': activeCategory === category.id,
              'text-neutral-400 hover:bg-neutral-800 hover:text-white': activeCategory !== category.id && theme === 'dark',
              'text-gray-500 hover:bg-gray-50 hover:text-gray-900': activeCategory !== category.id && theme === 'light',
            })}
          >
            <span className="mr-1">{category.icon}</span>
            {category.label}
          </button>
        ))}
      </div>

      {/* Emotes Grid */}
      <div className="h-72 overflow-y-auto p-2">
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
          <div className="grid grid-cols-6 gap-1">
            {filteredEmotes.map((emote) => (
              <button
                key={`${emote.source}-${emote.id}`}
                onClick={() => handleEmoteClick(emote)}
                className={classNames(
                  'relative flex items-center justify-center p-1.5 rounded-lg transition-all hover:scale-110 group',
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
                  className="w-8 h-8 object-contain"
                  loading="lazy"
                />
                {/* Animated indicator */}
                {emote.animated && (
                  <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
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
          Powered by 7TV, BTTV, FFZ
        </span>
      </div>
    </div>
  )
}
