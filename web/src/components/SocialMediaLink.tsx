import { Facebook, Instagram, Soundcloud, Twitter } from 'icons/social'

const companies = {
  instagram: {
    label: 'Instagram',
    icon: Instagram,
    getLink(handle: string) {
      return `https://www.instagram.com/${handle}`
    },
  },
  twitter: {
    label: 'Twitter',
    icon: Twitter,
    getLink(handle: string) {
      return `https://twitter.com/${handle}`
    },
  },
  facebook: {
    label: 'Facebook',
    icon: Facebook,
    getLink(handle: string) {
      return `https://www.facebook.com/${handle}`
    },
  },
  soundcloud: {
    label: 'SoundCloud',
    icon: Soundcloud,
    getLink(handle: string) {
      return `https://soundcloud.com/${handle}/`
    },
  },
}

type SocialMediaCompany = 'instagram' | 'twitter' | 'facebook' | 'soundcloud'

interface Props {
  company: SocialMediaCompany
  handle: string
}

export const SocialMediaLink = ({ company, handle }: Props) => {
  const { getLink, icon: Icon, label } = companies[company]

  return (
    <a href={getLink(handle)} className="flex items-center text-gray-50" target="_blank" rel="noreferrer">
      <Icon className={company === 'soundcloud' ? 'scale-75' : ''} />
      <span className="ml-1 text-xs font-semibold">{label}</span>
    </a>
  )
}
