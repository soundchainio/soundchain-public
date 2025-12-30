/**
 * Announcements Feed Page
 *
 * Public feed of announcements from startups/developers
 * building on the SoundChain platform.
 */

import { Button } from 'components/common/Buttons/Button'
import SEO from 'components/SEO'
import { ExternalLink, Eye, Clock, Tag } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

// Mock data - will be replaced with GraphQL query
const mockAnnouncements = [
  {
    id: '1',
    title: '🚀 SCid Certificate Uploads Are LIVE!',
    content: 'Upload your music to IPFS and get your SCid certificate. No wallet needed, no gas fees. Your music, your certificate, your control.',
    link: 'https://soundchain.io/upload',
    companyName: 'SoundChain',
    companyLogo: 'https://soundchain.io/soundchain-meta-logo.png',
    type: 'PRODUCT_LAUNCH',
    tags: ['web3', 'music', 'ipfs'],
    featured: true,
    viewCount: 1234,
    publishedAt: new Date().toISOString(),
  },
  {
    id: '2',
    title: '🤝 New Partnership with IPFS',
    content: 'We\'re excited to announce our integration with Pinata for decentralized music storage. All tracks are now permanently stored on IPFS.',
    link: 'https://pinata.cloud',
    companyName: 'SoundChain',
    companyLogo: 'https://soundchain.io/soundchain-meta-logo.png',
    type: 'PARTNERSHIP',
    tags: ['partnership', 'ipfs', 'pinata'],
    featured: false,
    viewCount: 567,
    publishedAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: '3',
    title: '✨ Developer Platform Launch',
    content: 'Startups can now post announcements to SoundChain via our new REST API. Get your API key and start reaching the Web3 music community!',
    link: 'https://soundchain.io/developers',
    companyName: 'SoundChain',
    companyLogo: 'https://soundchain.io/soundchain-meta-logo.png',
    type: 'FEATURE_UPDATE',
    tags: ['api', 'developers', 'startups'],
    featured: false,
    viewCount: 890,
    publishedAt: new Date(Date.now() - 172800000).toISOString(),
  },
]

const typeColors: Record<string, string> = {
  PRODUCT_LAUNCH: 'bg-purple-500/20 text-purple-400',
  FEATURE_UPDATE: 'bg-cyan-500/20 text-cyan-400',
  PARTNERSHIP: 'bg-green-500/20 text-green-400',
  EVENT: 'bg-yellow-500/20 text-yellow-400',
  COMMUNITY: 'bg-pink-500/20 text-pink-400',
  OTHER: 'bg-gray-500/20 text-gray-400',
}

const typeLabels: Record<string, string> = {
  PRODUCT_LAUNCH: 'Product Launch',
  FEATURE_UPDATE: 'Feature Update',
  PARTNERSHIP: 'Partnership',
  EVENT: 'Event',
  COMMUNITY: 'Community',
  OTHER: 'Announcement',
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffHours < 1) return 'Just now'
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

export default function AnnouncementsPage() {
  return (
    <>
      <SEO
        title="Announcements | SoundChain"
        description="Latest updates from startups and developers building on SoundChain - the Web3 music platform."
        canonicalUrl="/announcements"
      />
      <div className="min-h-screen bg-gray-900 py-8">
        <div className="max-w-3xl mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-4">
              Announcements
            </h1>
            <p className="text-xl text-gray-400">
              Latest updates from the SoundChain ecosystem
            </p>
          </div>

          {/* CTA for Developers */}
          <div className="bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/30 rounded-xl p-6 mb-8 text-center">
            <p className="text-gray-300 mb-4">
              Building something? Share it with the Web3 music community!
            </p>
            <Link href="/developers">
              <Button variant="outline" borderColor="bg-cyan-gradient">
                Get API Access →
              </Button>
            </Link>
          </div>

          {/* Announcements Feed */}
          <div className="space-y-6">
            {mockAnnouncements.map((announcement) => (
              <article
                key={announcement.id}
                className={`bg-gray-800/50 rounded-xl p-6 border ${
                  announcement.featured
                    ? 'border-cyan-500/50'
                    : 'border-gray-700'
                }`}
              >
                {/* Featured Badge */}
                {announcement.featured && (
                  <div className="mb-4">
                    <span className="bg-cyan-500/20 text-cyan-400 text-xs px-2 py-1 rounded">
                      ⭐ Featured
                    </span>
                  </div>
                )}

                {/* Header */}
                <div className="flex items-start gap-4 mb-4">
                  {announcement.companyLogo && (
                    <div className="relative w-12 h-12 rounded-full overflow-hidden bg-gray-700 flex-shrink-0">
                      <Image
                        src={announcement.companyLogo}
                        alt={announcement.companyName}
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-white">
                        {announcement.companyName}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded ${typeColors[announcement.type]}`}>
                        {typeLabels[announcement.type]}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(announcement.publishedAt)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {announcement.viewCount.toLocaleString()} views
                      </span>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <h2 className="text-xl font-bold text-white mb-2">
                  {announcement.title}
                </h2>
                <p className="text-gray-300 mb-4">
                  {announcement.content}
                </p>

                {/* Tags */}
                {announcement.tags && announcement.tags.length > 0 && (
                  <div className="flex items-center gap-2 mb-4 flex-wrap">
                    <Tag className="w-3 h-3 text-gray-500" />
                    {announcement.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-xs text-gray-400 bg-gray-700/50 px-2 py-0.5 rounded"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Link */}
                {announcement.link && (
                  <a
                    href={announcement.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 text-sm"
                  >
                    Learn more
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </article>
            ))}
          </div>

          {/* Load More */}
          <div className="mt-8 text-center">
            <Button variant="outline">
              Load More
            </Button>
          </div>

          {/* Footer */}
          <div className="mt-12 text-center text-sm text-gray-500">
            <p>
              Want to post here?{' '}
              <Link href="/developers" className="text-cyan-400 hover:underline">
                Get API Access →
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
