import { useState, useEffect } from 'react'
import { AutoplayVideo } from '../AutoplayMedia'
import { ExternalLink } from 'lucide-react'

interface TweetData {
  id: string
  text: string
  author: {
    name: string
    handle: string
    avatar: string
    verified: boolean
  }
  media: Array<{
    type: string
    thumbnailUrl: string
    videoUrl: string | null
    width?: number
    height?: number
  }>
  metrics: {
    replies: number
    retweets: number
    likes: number
  }
  createdAt: string
}

interface NativeTweetCardProps {
  tweetId: string
  originalUrl: string
}

const formatCount = (n: number): string => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

/**
 * NativeTweetCard — Renders X/Twitter content natively in SoundChain's dark theme.
 * Fetches tweet data from /api/social/tweet, renders author, text, media, metrics.
 * Videos use AutoplayVideo (autoplay muted on scroll).
 */
export const NativeTweetCard = ({ tweetId, originalUrl }: NativeTweetCardProps) => {
  const [tweet, setTweet] = useState<TweetData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/social/tweet?id=${tweetId}`)
      .then(r => {
        if (!r.ok) throw new Error('Failed')
        return r.json()
      })
      .then(data => {
        if (!cancelled) {
          setTweet(data)
          setLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(true)
          setLoading(false)
        }
      })
    return () => { cancelled = true }
  }, [tweetId])

  // Loading skeleton
  if (loading) {
    return (
      <div className="bg-neutral-900/50 rounded-lg p-4 animate-pulse">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-neutral-700" />
          <div className="flex-1">
            <div className="h-3 bg-neutral-700 rounded w-24 mb-1" />
            <div className="h-2.5 bg-neutral-800 rounded w-16" />
          </div>
        </div>
        <div className="h-3 bg-neutral-700 rounded w-full mb-2" />
        <div className="h-3 bg-neutral-700 rounded w-3/4" />
      </div>
    )
  }

  // Error fallback — link to original tweet
  if (error || !tweet) {
    const tweetUrl = originalUrl
      .replace('platform.twitter.com/embed/Tweet.html?id=', 'x.com/i/status/')
    return (
      <a
        href={tweetUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 p-4 bg-neutral-900/50 rounded-lg border border-neutral-800 hover:border-neutral-600 transition-colors"
      >
        <svg viewBox="0 0 24 24" className="w-6 h-6 text-neutral-400 flex-shrink-0" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
        <div className="flex-1 min-w-0">
          <span className="text-sm text-neutral-300">View on X</span>
        </div>
        <ExternalLink className="w-4 h-4 text-neutral-500" />
      </a>
    )
  }

  const tweetUrl = `https://x.com/${tweet.author.handle}/status/${tweet.id}`
  const hasVideo = tweet.media.some(m => m.type === 'video' || m.type === 'animated_gif')
  const hasPhotos = tweet.media.some(m => m.type === 'photo')

  return (
    <div className="bg-neutral-900/50 rounded-lg border border-neutral-800 overflow-hidden">
      {/* Author header */}
      <div className="flex items-center gap-3 p-3 pb-0">
        <img
          src={tweet.author.avatar}
          alt={tweet.author.name}
          className="w-10 h-10 rounded-full"
          onError={(e) => { (e.target as HTMLImageElement).src = '/images/default-avatar.png' }}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <span className="text-white text-sm font-semibold truncate">{tweet.author.name}</span>
            {tweet.author.verified && (
              <svg viewBox="0 0 22 22" className="w-4 h-4 text-blue-400 flex-shrink-0" fill="currentColor">
                <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.855-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" />
              </svg>
            )}
          </div>
          <span className="text-neutral-500 text-xs">@{tweet.author.handle}</span>
        </div>
        {/* X logo */}
        <a href={tweetUrl} target="_blank" rel="noopener noreferrer" className="flex-shrink-0">
          <svg viewBox="0 0 24 24" className="w-5 h-5 text-neutral-400 hover:text-white transition-colors" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        </a>
      </div>

      {/* Tweet text */}
      {tweet.text && (
        <p className="px-3 pt-2 text-sm text-neutral-200 whitespace-pre-wrap break-words leading-relaxed">
          {tweet.text}
        </p>
      )}

      {/* Video media — autoplay muted on scroll */}
      {hasVideo && tweet.media.filter(m => m.type === 'video' || m.type === 'animated_gif').map((m, i) => (
        m.videoUrl ? (
          <div key={i} className="mt-2">
            <AutoplayVideo
              src={m.videoUrl}
              className="w-full"
              muted={true}
              loop={m.type === 'animated_gif'}
            />
          </div>
        ) : m.thumbnailUrl ? (
          <img key={i} src={m.thumbnailUrl} alt="" className="mt-2 w-full" />
        ) : null
      ))}

      {/* Photo media */}
      {hasPhotos && !hasVideo && (
        <div className={`mt-2 ${tweet.media.filter(m => m.type === 'photo').length > 1 ? 'grid grid-cols-2 gap-0.5' : ''}`}>
          {tweet.media.filter(m => m.type === 'photo').map((m, i) => (
            <img
              key={i}
              src={m.thumbnailUrl}
              alt=""
              className="w-full object-cover"
              loading="lazy"
            />
          ))}
        </div>
      )}

      {/* Metrics footer */}
      <div className="flex items-center gap-5 px-3 py-2.5 text-neutral-500 text-xs">
        <span className="flex items-center gap-1">
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
          {formatCount(tweet.metrics.replies)}
        </span>
        <span className="flex items-center gap-1">
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
          {formatCount(tweet.metrics.retweets)}
        </span>
        <span className="flex items-center gap-1">
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          {formatCount(tweet.metrics.likes)}
        </span>
      </div>
    </div>
  )
}
