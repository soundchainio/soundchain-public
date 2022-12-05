import { Facebook, Instagram, Soundcloud, Twitter } from 'icons/social'
import { BandcampSquare } from 'icons/social/BandcampSquare'
import { Discord } from 'icons/social/Discord'
import { LinktreeSquare } from 'icons/social/LinktreeSquare'
import { SpotifySquare } from 'icons/social/SpotifySquare'
import { TelegramSquare } from 'icons/social/TelegramSquare'

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
      return `https://discord.gg/${handle}/`
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
      return `https://open.spotify.com/${handle}/`
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
}

type SocialMediaCompany =
  | 'instagram'
  | 'twitter'
  | 'facebook'
  | 'soundcloud'
  | 'linktree'
  | 'discord'
  | 'telegram'
  | 'spotify'
  | 'bandcamp'

interface Props {
  company: SocialMediaCompany
  handle: string
}

export const SocialMediaLink = ({ company, handle }: Props) => {
  const { getLink, icon: Icon, label, customClassName } = companies[company]

  return (
    <a href={getLink(handle)} className="flex items-center text-gray-50" target="_blank" rel="noreferrer">
      <Icon className={customClassName} />
      <span className="ml-1 text-xs font-semibold">{label}</span>
    </a>
  )
}
