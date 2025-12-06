import { XCircleIcon, InformationCircleIcon } from '@heroicons/react/24/outline'
import { Bandcamp } from 'icons/Bandcamp'
import { Soundcloud } from 'icons/Soundcloud'
import { Spotify } from 'icons/Spotify'
import { Vimeo } from 'icons/Vimeo'
import { Youtube } from 'icons/Youtube'
import { Instagram } from 'icons/social/Instagram'
import { TikTok } from 'icons/TikTok'
import { Facebook } from 'icons/Facebook'
import { XTwitter } from 'icons/XTwitter'
import { CustomHTML } from 'icons/CustomHTML'
import React, { useEffect, useState } from 'react'
import { MediaProvider } from 'types/MediaProvider'

export interface MediaLink {
  value: string
  type?: MediaProvider
}

interface PostLinkInputProps {
  type: MediaProvider
  setLink: (value: MediaLink | undefined) => void
  link?: MediaLink
  setPostLink: (value: string) => void
}

const mediaProviderOptions: Record<string, { name: string; example: string; tooltip: string; logo: JSX.Element }> = {
  [MediaProvider.SPOTIFY]: {
    name: 'Spotify',
    example: 'https://open.spotify.com/track/... or embed code',
    tooltip: 'Paste Spotify track/album/playlist link OR embed code. Full playback supported!',
    logo: <Spotify />,
  },
  [MediaProvider.SOUNDCLOUD]: {
    name: 'SoundCloud',
    example: 'https://soundcloud.com/artist/music or embed code',
    tooltip: 'Paste SoundCloud track link OR embed code. Both work!',
    logo: <Soundcloud color="#FF7A00" className="scale-150" />,
  },
  [MediaProvider.YOUTUBE]: {
    name: 'Youtube',
    example: 'Any YouTube link (watch, shorts, embed, youtu.be)',
    tooltip: 'Paste ANY YouTube link - watch, shorts, embeds, youtu.be - all formats supported!',
    logo: <Youtube />,
  },
  [MediaProvider.VIMEO]: {
    name: 'Vimeo',
    example: 'https://vimeo.com/12345 or embed code',
    tooltip: 'Paste Vimeo video link OR embed code',
    logo: <Vimeo />,
  },
  [MediaProvider.BANDCAMP]: {
    name: 'Bandcamp',
    example: 'https://artist.bandcamp.com/album/name or embed code',
    tooltip: 'Paste Bandcamp album/track link OR embed code. Auto-scales to fit!',
    logo: <Bandcamp />,
  },
  [MediaProvider.INSTAGRAM]: {
    name: 'Instagram',
    example: 'https://instagram.com/p/... (posts, reels, TV)',
    tooltip: 'Paste Instagram post, reel, or TV link. Embed codes also work!',
    logo: <Instagram className="scale-150" />,
  },
  [MediaProvider.TIKTOK]: {
    name: 'TikTok',
    example: 'https://tiktok.com/@user/video/...',
    tooltip: 'Paste TikTok video link or embed code',
    logo: <TikTok />,
  },
  [MediaProvider.FACEBOOK]: {
    name: 'Facebook',
    example: 'https://facebook.com/.../videos/...',
    tooltip: 'Paste Facebook video link or embed code',
    logo: <Facebook />,
  },
  [MediaProvider.X]: {
    name: 'X (Twitter)',
    example: 'https://twitter.com/.../status/... or x.com',
    tooltip: 'Paste X/Twitter post link or embed code',
    logo: <XTwitter />,
  },
  [MediaProvider.CUSTOM_HTML]: {
    name: '🌐 Custom Embed',
    example: 'Paste any iframe embed code or URL',
    tooltip: 'ULTIMATE POWER! Paste ANY custom embed code or iframe. Works with any platform!',
    logo: <CustomHTML className="text-purple-500" />,
  },
}

export const PostLinkInput = ({ type, setLink, link, setPostLink }: PostLinkInputProps) => {
  const [fieldValue, setFieldValue] = useState('')

  const onChange = (value: string) => {
    setFieldValue(value)
  }

  const onClear = () => {
    setFieldValue('')
    setLink(undefined)
    setPostLink('')
  }

  const isDisabled = () => {
    if (link) {
      return link.type != type && link.value != ''
    }

    return false
  }

  const onBlur = () => {
    setLink({ type, value: fieldValue })
  }

  useEffect(() => {
    link && link.type == type ? setFieldValue(link.value) : setFieldValue('')
  }, [link])

  return (
    <div className="mt-4 mb-10 flex items-center text-gray-400">
      <div className="flex w-20 flex-col items-center text-xs">{mediaProviderOptions[type].logo}</div>
      <div className="flex flex-1 flex-col">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold text-gray-300">{mediaProviderOptions[type].name}</span>
          <div className="group relative">
            <InformationCircleIcon className="w-4 h-4 text-gray-500 hover:text-blue-400 cursor-help" />
            <div className="absolute left-0 top-6 z-50 hidden group-hover:block w-64 p-2 bg-gray-900 border border-gray-700 rounded-lg text-xs text-white shadow-xl">
              {mediaProviderOptions[type].tooltip}
            </div>
          </div>
        </div>
        <input
          type="text"
          aria-label={`Enter ${mediaProviderOptions[type].name} link`}
          placeholder={`Enter ${mediaProviderOptions[type].name} link`}
          className="border-gray-700 bg-gray-30 p-2 text-sm focus:outline-none focus:ring-0 disabled:opacity-50"
          onChange={e => onChange(e.target.value)}
          onBlur={onBlur}
          value={fieldValue}
          disabled={isDisabled()}
        />
        <div className="relative">
          <span className="absolute top-2 left-0 text-xs opacity-60">({mediaProviderOptions[type].example})</span>
        </div>
      </div>
      <button className="w-16" onClick={onClear} aria-label="Close">
        <XCircleIcon className="m-auto w-6" />
      </button>
    </div>
  )
}
