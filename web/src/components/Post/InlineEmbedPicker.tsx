import { XCircleIcon } from '@heroicons/react/24/outline'
import { Bandcamp } from 'icons/Bandcamp'
import { Soundcloud } from 'icons/Soundcloud'
import { Spotify } from 'icons/Spotify'
import { Vimeo } from 'icons/Vimeo'
import { Youtube } from 'icons/Youtube'
import { Instagram } from 'icons/social/Instagram'
import { TikTok } from 'icons/TikTok'
import { Facebook } from 'icons/Facebook'
import { XTwitter } from 'icons/XTwitter'
import { Twitch } from 'icons/Twitch'
import { useState, useEffect } from 'react'
import { MediaProvider } from 'types/MediaProvider'
import { IdentifySource } from 'utils/NormalizeEmbedLinks'

interface InlineEmbedPickerProps {
  type: 'music' | 'video'
  onLinkChange: (link: string) => void
  currentLink?: string
}

const musicPlatforms = [
  { provider: MediaProvider.SOUNDCLOUD, name: 'SoundCloud', placeholder: 'soundcloud.com/artist/track', logo: <Soundcloud color="#FF7A00" className="w-5 h-5" /> },
  { provider: MediaProvider.SPOTIFY, name: 'Spotify', placeholder: 'open.spotify.com/track/...', logo: <Spotify className="w-5 h-5" /> },
  { provider: MediaProvider.BANDCAMP, name: 'Bandcamp', placeholder: 'artist.bandcamp.com/album/...', logo: <Bandcamp className="w-5 h-5" /> },
]

const videoPlatforms = [
  { provider: MediaProvider.YOUTUBE, name: 'YouTube', placeholder: 'youtube.com/watch?v=...', logo: <Youtube className="w-5 h-5" /> },
  { provider: MediaProvider.VIMEO, name: 'Vimeo', placeholder: 'vimeo.com/12345', logo: <Vimeo className="w-5 h-5" /> },
  { provider: MediaProvider.TIKTOK, name: 'TikTok', placeholder: 'tiktok.com/@user/video/...', logo: <TikTok className="w-5 h-5" /> },
  { provider: MediaProvider.TWITCH, name: 'Twitch', placeholder: 'twitch.tv/channel', logo: <Twitch className="w-5 h-5" /> },
  { provider: MediaProvider.INSTAGRAM, name: 'Instagram', placeholder: 'instagram.com/p/...', logo: <Instagram className="w-5 h-5" /> },
  { provider: MediaProvider.X, name: 'X/Twitter', placeholder: 'twitter.com/.../status/...', logo: <XTwitter className="w-5 h-5" /> },
  { provider: MediaProvider.FACEBOOK, name: 'Facebook', placeholder: 'facebook.com/.../videos/...', logo: <Facebook className="w-5 h-5" /> },
]

export const InlineEmbedPicker = ({ type, onLinkChange, currentLink }: InlineEmbedPickerProps) => {
  const platforms = type === 'music' ? musicPlatforms : videoPlatforms
  const [inputValues, setInputValues] = useState<Record<string, string>>({})
  const [activeProvider, setActiveProvider] = useState<MediaProvider | null>(null)

  // Detect which platform the current link belongs to
  useEffect(() => {
    if (currentLink) {
      const identified = IdentifySource(currentLink)
      if (identified.type) {
        setActiveProvider(identified.type)
        setInputValues({ [identified.type]: currentLink })
      }
    } else {
      setActiveProvider(null)
      setInputValues({})
    }
  }, [currentLink])

  const handleInputChange = (provider: MediaProvider, value: string) => {
    setInputValues({ ...inputValues, [provider]: value })
  }

  const handleInputBlur = (provider: MediaProvider) => {
    const value = inputValues[provider]
    if (value && value.trim()) {
      onLinkChange(value.trim())
      setActiveProvider(provider)
    }
  }

  const handleClear = () => {
    setInputValues({})
    setActiveProvider(null)
    onLinkChange('')
  }

  return (
    <div
      className="border-t border-neutral-700 overflow-hidden animate-in slide-in-from-top-2 duration-200"
      style={{ backgroundColor: '#1a1a1a' }}
    >
      <div className="px-4 py-2">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-400">
            {type === 'music' ? 'Embed music from:' : 'Embed video from:'}
          </span>
          {activeProvider && (
            <button
              onClick={handleClear}
              className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
            >
              <XCircleIcon className="w-3 h-3" />
              Clear
            </button>
          )}
        </div>
        <div className="space-y-2 max-h-[200px] overflow-y-auto">
          {platforms.map(({ provider, name, placeholder, logo }) => {
            const isActive = activeProvider === provider
            const isDisabled = activeProvider !== null && activeProvider !== provider

            return (
              <div
                key={provider}
                className={`flex items-center gap-2 p-2 rounded-lg transition-all ${
                  isActive ? 'bg-cyan-900/30 ring-1 ring-cyan-500/50' :
                  isDisabled ? 'opacity-40' : 'hover:bg-neutral-800'
                }`}
              >
                <div className="flex-shrink-0 w-6 flex justify-center">
                  {logo}
                </div>
                <input
                  type="text"
                  placeholder={placeholder}
                  value={inputValues[provider] || ''}
                  onChange={(e) => handleInputChange(provider, e.target.value)}
                  onBlur={() => handleInputBlur(provider)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleInputBlur(provider)
                    }
                  }}
                  disabled={isDisabled}
                  className="flex-1 bg-transparent border-none text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-0 disabled:cursor-not-allowed"
                />
                {isActive && (
                  <span className="text-xs text-cyan-400">✓</span>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
