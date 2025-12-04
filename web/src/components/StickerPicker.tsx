import { useState } from 'react'
import classNames from 'classnames'
import { Fire, Sad, Happy, Hundred, Horns, Heart, Rocket, Sunglasses } from '../icons/emoji'

// SoundChain Custom Stickers
const soundchainStickers = [
  { id: 'fire', component: Fire, name: 'Fire' },
  { id: 'heart', component: Heart, name: 'Heart' },
  { id: 'rocket', component: Rocket, name: 'Rocket' },
  { id: 'hundred', component: Hundred, name: '100' },
  { id: 'horns', component: Horns, name: 'Horns' },
  { id: 'sunglasses', component: Sunglasses, name: 'Sunglasses' },
  { id: 'happy', component: Happy, name: 'Happy' },
  { id: 'sad', component: Sad, name: 'Sad' },
]

// Twitch Stickers (popular emotes)
const twitchStickers = [
  { id: 'kappa', text: 'Kappa', name: 'Kappa' },
  { id: 'pogchamp', text: 'PogChamp', name: 'PogChamp' },
  { id: 'lul', text: 'LUL', name: 'LUL' },
  { id: 'monkas', text: 'monkaS', name: 'monkaS' },
  { id: 'pepega', text: 'Pepega', name: 'Pepega' },
  { id: 'omegalul', text: 'OMEGALUL', name: 'OMEGALUL' },
  { id: 'kekw', text: 'KEKW', name: 'KEKW' },
  { id: 'sadge', text: 'Sadge', name: 'Sadge' },
]

// Kick.com Stickers
const kickStickers = [
  { id: 'kick-hype', text: '💚 HYPE', name: 'Kick Hype' },
  { id: 'kick-fire', text: '🔥 FIRE', name: 'Kick Fire' },
  { id: 'kick-gg', text: '🎮 GG', name: 'Kick GG' },
  { id: 'kick-raid', text: '⚡ RAID', name: 'Kick Raid' },
  { id: 'kick-vibes', text: '✨ VIBES', name: 'Kick Vibes' },
  { id: 'kick-w', text: '💎 W', name: 'Kick W' },
  { id: 'kick-based', text: '🔊 BASED', name: 'Kick Based' },
  { id: 'kick-blessed', text: '🙏 BLESSED', name: 'Kick Blessed' },
]

type StickerCategory = 'soundchain' | 'twitch' | 'kick'

interface StickerPickerProps {
  onSelect: (sticker: string) => void
  theme?: 'dark' | 'light'
}

export const StickerPicker = ({ onSelect, theme = 'dark' }: StickerPickerProps) => {
  const [activeCategory, setActiveCategory] = useState<StickerCategory>('soundchain')

  const categories = [
    { id: 'soundchain' as const, label: 'SoundChain', icon: '🎵' },
    { id: 'twitch' as const, label: 'Twitch', icon: '💜' },
    { id: 'kick' as const, label: 'Kick', icon: '💚' },
  ]

  const getActiveStickers = () => {
    switch (activeCategory) {
      case 'soundchain':
        return soundchainStickers
      case 'twitch':
        return twitchStickers
      case 'kick':
        return kickStickers
    }
  }

  const handleStickerClick = (sticker: any) => {
    // For SVG components, we'll insert a text representation
    // For text stickers, insert the text directly
    if (sticker.text) {
      onSelect(` ${sticker.text} `)
    } else {
      onSelect(` [${sticker.name}] `)
    }
  }

  return (
    <div
      className={classNames('w-80 rounded-lg shadow-xl', {
        'bg-gray-800 text-white': theme === 'dark',
        'bg-white text-gray-900': theme === 'light',
      })}
    >
      {/* Category Tabs */}
      <div className="flex border-b border-gray-700">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => setActiveCategory(category.id)}
            className={classNames('flex-1 px-4 py-3 text-sm font-medium transition-colors', {
              'bg-gray-700 text-white': activeCategory === category.id && theme === 'dark',
              'bg-gray-100 text-gray-900': activeCategory === category.id && theme === 'light',
              'text-gray-400 hover:bg-gray-750': activeCategory !== category.id && theme === 'dark',
              'text-gray-600 hover:bg-gray-50': activeCategory !== category.id && theme === 'light',
            })}
          >
            <span className="mr-2">{category.icon}</span>
            {category.label}
          </button>
        ))}
      </div>

      {/* Stickers Grid */}
      <div className="grid grid-cols-4 gap-2 p-4 max-h-64 overflow-y-auto">
        {getActiveStickers().map((sticker) => {
          const StickerComponent = 'component' in sticker ? sticker.component : null

          return (
            <button
              key={sticker.id}
              onClick={() => handleStickerClick(sticker)}
              className={classNames(
                'flex flex-col items-center justify-center p-2 rounded-lg transition-all hover:scale-110',
                {
                  'hover:bg-gray-700': theme === 'dark',
                  'hover:bg-gray-100': theme === 'light',
                }
              )}
              title={sticker.name}
            >
              {StickerComponent ? (
                <StickerComponent className="w-10 h-10" />
              ) : (
                <div className="text-2xl">{sticker.text}</div>
              )}
              <span className="text-xs mt-1 truncate w-full text-center opacity-75">{sticker.name}</span>
            </button>
          )
        })}
      </div>

      <div className="px-4 py-2 text-xs text-gray-500 border-t border-gray-700 text-center">
        Click any sticker to add it to your post
      </div>
    </div>
  )
}
