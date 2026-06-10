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
  /** First/primary link — keeps the single-embed (mediaLink) path working. */
  onLinkChange: (link: string) => void
  /** Full list — when 2+, the post stores mediaLinks and renders a carousel. */
  onLinksChange?: (links: string[]) => void
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

const MAX_EMBEDS = 8

export const InlineEmbedPicker = ({ type, onLinkChange, onLinksChange, currentLink }: InlineEmbedPickerProps) => {
  const platforms = type === 'music' ? musicPlatforms : videoPlatforms
  const [inputValues, setInputValues] = useState<Record<string, string>>({})
  // Added embeds — 2+ become a swipeable carousel on the post.
  const [links, setLinks] = useState<string[]>([])

  // Seed from an existing single link (editing / pre-filled).
  useEffect(() => {
    if (currentLink && !links.includes(currentLink)) {
      setLinks((prev) => (prev.length ? prev : [currentLink]))
    }
    if (!currentLink && links.length === 0) {
      // parent cleared — nothing to do
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLink])

  const emit = (next: string[]) => {
    setLinks(next)
    onLinkChange(next[0] || '')
    onLinksChange?.(next)
  }

  const addLink = (provider: MediaProvider) => {
    const value = (inputValues[provider] || '').trim()
    if (!value) return
    if (links.includes(value)) {
      setInputValues({ ...inputValues, [provider]: '' })
      return
    }
    if (links.length >= MAX_EMBEDS) return
    emit([...links, value])
    setInputValues({ ...inputValues, [provider]: '' })
  }

  const removeLink = (link: string) => emit(links.filter((l) => l !== link))

  const handleClearAll = () => {
    setInputValues({})
    emit([])
  }

  const iconFor = (link: string) => {
    const t = IdentifySource(link).type
    const all = [...musicPlatforms, ...videoPlatforms]
    return all.find((p) => p.provider === t)?.logo ?? null
  }

  return (
    <div
      className="border-t border-neutral-700 overflow-hidden animate-in slide-in-from-top-2 duration-200"
      style={{ backgroundColor: '#1a1a1a' }}
    >
      <div className="px-4 py-2">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-gray-400">
            {type === 'music' ? 'Embed music' : 'Embed video'}
            <span className="ml-1 text-cyan-400/80">· add 2+ for a 🎠 swipeable carousel</span>
          </span>
          {links.length > 0 && (
            <button
              onClick={handleClearAll}
              className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
            >
              <XCircleIcon className="w-3 h-3" />
              Clear
            </button>
          )}
        </div>

        {/* Added-embeds chips — the carousel you're building */}
        {links.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {links.map((link, i) => (
              <span
                key={link}
                className="inline-flex items-center gap-1.5 pl-1.5 pr-1 py-1 rounded-full bg-neutral-800 border border-neutral-700 text-[11px] text-white max-w-[180px]"
                title={link}
              >
                <span className="flex-shrink-0 w-4 h-4 flex items-center justify-center [&>svg]:w-3.5 [&>svg]:h-3.5">{iconFor(link)}</span>
                <span className="text-cyan-400 font-semibold">{i + 1}</span>
                <span className="truncate text-neutral-400">{link.replace(/^https?:\/\/(www\.)?/, '')}</span>
                <button
                  onClick={() => removeLink(link)}
                  className="flex-shrink-0 w-4 h-4 rounded-full hover:bg-red-500/30 text-neutral-400 hover:text-red-300 flex items-center justify-center"
                  title="Remove"
                >
                  ×
                </button>
              </span>
            ))}
            {links.length >= 2 && (
              <span className="inline-flex items-center px-2 py-1 rounded-full bg-cyan-500/15 text-cyan-300 text-[11px] font-semibold">
                🎠 {links.length} embeds · swipeable
              </span>
            )}
          </div>
        )}

        <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
          {platforms.map(({ provider, name, placeholder, logo }) => (
            <div
              key={provider}
              className="flex items-center gap-2 p-2 rounded-lg transition-all hover:bg-neutral-800"
            >
              <div className="flex-shrink-0 w-6 flex justify-center">{logo}</div>
              <input
                type="text"
                placeholder={placeholder}
                value={inputValues[provider] || ''}
                onChange={(e) => setInputValues({ ...inputValues, [provider]: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addLink(provider)
                  }
                }}
                className="flex-1 bg-transparent border-none text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-0"
              />
              {(inputValues[provider] || '').trim() && links.length < MAX_EMBEDS && (
                <button
                  onClick={() => addLink(provider)}
                  className="flex-shrink-0 text-[11px] font-semibold px-2 py-1 rounded-full bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30"
                >
                  Add
                </button>
              )}
            </div>
          ))}
        </div>
        {links.length >= MAX_EMBEDS && (
          <div className="text-[10px] text-amber-400 mt-1">Max {MAX_EMBEDS} embeds per post.</div>
        )}
      </div>
    </div>
  )
}
