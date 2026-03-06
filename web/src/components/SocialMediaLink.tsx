import { Facebook, Instagram, Soundcloud, Twitter } from 'icons/social'
import { BandcampSquare } from 'icons/social/BandcampSquare'
import { Discord } from 'icons/social/Discord'
import { LinktreeSquare } from 'icons/social/LinktreeSquare'
import { SpotifySquare } from 'icons/social/SpotifySquare'
import { TelegramSquare } from 'icons/social/TelegramSquare'
import { X } from 'icons/social/X'
import { TikTok } from 'icons/social/TikTok'

// Simple globe icon for OnlyFans and custom links
const GlobeIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
)

const companies = {
  instagram: {
    label: 'Instagram',
    icon: Instagram,
    getLink(handle: string) {
      return `https://www.instagram.com/${handle}`
    },
    customClassName: '',
  },
  twitter: {
    label: 'Twitter',
    icon: Twitter,
    getLink(handle: string) {
      return `https://twitter.com/${handle}`
    },
    customClassName: '',
  },
  facebook: {
    label: 'Facebook',
    icon: Facebook,
    getLink(handle: string) {
      return `https://www.facebook.com/${handle}`
    },
    customClassName: '',
  },
  soundcloud: {
    label: 'SoundCloud',
    icon: Soundcloud,
    getLink(handle: string) {
      return `https://soundcloud.com/${handle}/`
    },
    customClassName: 'scale-75',
  },
  linktree: {
    label: 'Linktree',
    icon: LinktreeSquare,
    getLink(handle: string) {
      return `https://linktr.ee/${handle}/`
    },
    customClassName: '',
  },
  discord: {
    label: 'Discord',
    icon: Discord,
    getLink(handle: string) {
      return `https://discord.gg/${handle}`
    },
    customClassName: '',
  },
  telegram: {
    label: 'Telegram',
    icon: TelegramSquare,
    getLink(handle: string) {
      return `https://t.me/${handle}/`
    },
    customClassName: '',
  },
  spotify: {
    label: 'Spotify',
    icon: SpotifySquare,
    getLink(handle: string) {
      return `https://open.spotify.com/artist/${handle}/`
    },
    customClassName: '',
  },
  bandcamp: {
    label: 'Bandcamp',
    icon: BandcampSquare,
    getLink(handle: string) {
      return `https://bandcamp.com/${handle}/`
    },
    customClassName: '',
  },
  x: {
    label: 'X',
    icon: X,
    getLink(handle: string) {
      return `https://x.com/${handle}`
    },
    customClassName: '',
  },
  tiktok: {
    label: 'TikTok',
    icon: TikTok,
    getLink(handle: string) {
      return `https://www.tiktok.com/@${handle}`
    },
    customClassName: '',
  },
  onlyfans: {
    label: 'OnlyFans',
    icon: GlobeIcon,
    getLink(handle: string) {
      return `https://onlyfans.com/${handle}`
    },
    customClassName: '',
  },
  customLink: {
    label: 'Link',
    icon: GlobeIcon,
    getLink(handle: string) {
      // Custom links may already be full URLs
      if (handle.startsWith('http://') || handle.startsWith('https://')) {
        return handle
      }
      return `https://${handle}`
    },
    customClassName: '',
  },
}

type SocialMediaCompany = keyof typeof companies

interface Props {
  company: SocialMediaCompany
  handle: string
}

export const SocialMediaLink = ({ company, handle }: Props) => {
  const config = companies[company]
  if (!config) return null

  const { getLink, icon: Icon, customClassName } = config

  return (
    <a href={getLink(handle)} className="flex items-center text-gray-50" target="_blank" rel="noreferrer">
      <Icon className={`${customClassName} h-[20px] w-[20px]`} />
    </a>
  )
}
