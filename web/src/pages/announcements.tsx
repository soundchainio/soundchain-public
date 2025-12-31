/**
 * Announcements Feed Page
 *
 * Public feed of announcements from startups/developers
 * building on the SoundChain platform.
 *
 * Fetches from /v1/feed REST API endpoint
 */

import { Button } from 'components/common/Buttons/Button'
import SEO from 'components/SEO'
import { ExternalLink, Eye, Clock, Tag, Loader2 } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'

interface Announcement {
  id: string
  title: string
  content: string
  link?: string
  imageUrl?: string
  videoUrl?: string
  mediaType?: string
  companyName: string
  companyLogo?: string
  type: string
  tags: string[]
  featured: boolean
  viewCount: number
  publishedAt: string
}

// API endpoint - use relative URL in production
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.soundchain.io'

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
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchAnnouncements() {
      try {
        // Use direct API Gateway URL for reliability
        const response = await fetch('https://19ne212py4.execute-api.us-east-1.amazonaws.com/production/v1/feed')
        if (!response.ok) throw new Error('Failed to fetch announcements')
        const data = await response.json()
        setAnnouncements(data.announcements || [])
      } catch (err) {
        console.error('Error fetching announcements:', err)
        setError('Failed to load announcements')
      } finally {
        setLoading(false)
      }
    }
    fetchAnnouncements()
  }, [])

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

          {/* Loading State */}
          {loading && (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="text-center py-12 text-red-400">
              {error}
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && announcements.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              No announcements yet. Be the first to post!
            </div>
          )}

          {/* Announcements Feed */}
          <div className="space-y-6">
            {announcements.map((announcement) => (
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
                <p className="text-gray-300 mb-4 whitespace-pre-wrap">
                  {announcement.content}
                </p>

                {/* Image/Media */}
                {announcement.imageUrl && (
                  <div className="relative w-full h-48 md:h-64 rounded-lg overflow-hidden mb-4 bg-gray-700">
                    <Image
                      src={announcement.imageUrl}
                      alt={announcement.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}

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
