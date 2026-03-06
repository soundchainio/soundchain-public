/**
 * Social Links Panel - Follow Us Popover
 * Displays all SoundChain social media links
 */

import { FaDiscord, FaTelegramPlane, FaTwitter, FaYoutube, FaInstagram } from 'react-icons/fa'
import { ExternalLink } from 'lucide-react'

const socialLinks = [
  {
    name: 'Twitter / X',
    handle: '@soundchain_io',
    url: 'https://twitter.com/soundchain_io',
    icon: FaTwitter,
    color: 'from-blue-400 to-blue-600',
    hoverBg: 'hover:bg-blue-500/20',
    iconColor: 'text-blue-400',
  },
  {
    name: 'Discord',
    handle: 'Join Community',
    url: 'https://discord.gg/5yZG6BTTHV',
    icon: FaDiscord,
    color: 'from-indigo-400 to-indigo-600',
    hoverBg: 'hover:bg-indigo-500/20',
    iconColor: 'text-indigo-400',
  },
  {
    name: 'Telegram',
    handle: 'Join Chat',
    url: 'https://t.me/+DbHfqlVpV644ZGMx',
    icon: FaTelegramPlane,
    color: 'from-cyan-400 to-cyan-600',
    hoverBg: 'hover:bg-cyan-500/20',
    iconColor: 'text-cyan-400',
  },
  {
    name: 'Instagram',
    handle: '@soundchain.io',
    url: 'https://instagram.com/soundchain.io',
    icon: FaInstagram,
    color: 'from-pink-400 via-purple-500 to-orange-400',
    hoverBg: 'hover:bg-pink-500/20',
    iconColor: 'text-pink-400',
  },
  {
    name: 'YouTube',
    handle: 'SoundChain',
    url: 'https://youtube.com/channel/UC-TJ1KIYWCYLtngwaELgyLQ',
    icon: FaYoutube,
    color: 'from-red-500 to-red-600',
    hoverBg: 'hover:bg-red-500/20',
    iconColor: 'text-red-500',
  },
]

export const SocialLinksPanel = () => {
  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-700">
        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-cyan-500 flex items-center justify-center">
          <span className="text-lg">🎵</span>
        </div>
        <div>
          <h3 className="font-bold text-white text-sm">Vibes</h3>
          <p className="text-xs text-gray-400">Connect with SoundChain</p>
        </div>
      </div>

      {/* Social Links */}
      <div className="space-y-2">
        {socialLinks.map((social) => {
          const Icon = social.icon
          return (
            <a
              key={social.name}
              href={social.url}
              target="_blank"
              rel="noreferrer"
              className={`flex items-center gap-3 p-3 rounded-xl transition-all ${social.hoverBg} group`}
            >
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${social.color} flex items-center justify-center shadow-lg`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-white text-sm group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-purple-400 group-hover:to-cyan-400 transition-all">
                  {social.name}
                </div>
                <div className={`text-xs ${social.iconColor}`}>{social.handle}</div>
              </div>
              <ExternalLink className="w-4 h-4 text-gray-500 group-hover:text-gray-300 transition-colors" />
            </a>
          )
        })}
      </div>

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-gray-700 text-center">
        <a
          href="https://soundchain.io"
          target="_blank"
          rel="noreferrer"
          className="text-xs text-gray-500 hover:text-purple-400 transition-colors"
        >
          soundchain.io
        </a>
      </div>
    </div>
  )
}

export default SocialLinksPanel
