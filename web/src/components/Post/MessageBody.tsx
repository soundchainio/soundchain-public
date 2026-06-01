import { useState, useEffect } from 'react'
import ReactPlayer from 'react-player'
import { NativeTweetCard } from './NativeTweetCard'
import { canPlayWithReactPlayer } from 'utils/NormalizeEmbedLinks'

/**
 * MessageBody — renders a DM / chat message body with RICH EMBEDS instead of
 * plain text. The feature SoundChain has needed since 2021: share a post into a
 * message and it shows a real preview, not a bare URL.
 *
 * Detects, per URL in the text:
 *   - a SoundChain POST link (/posts/<id>) → <SharedPostPreview> which fetches the
 *     post and renders its OWN media → so NFTs (track posts), SCID posts, X/YT
 *     embeds inside the post all render for free, tappable to open the full post.
 *   - a raw X/Twitter link → <NativeTweetCard> (inherits the poster fix → no black box)
 *   - a raw YouTube/Vimeo/playable link → <ReactPlayer>
 *   - a raw image/gif link → inline <img>
 *   - anything else → a styled outbound link
 * Non-URL text renders normally (preserves newlines).
 */

const URL_RE = /(https?:\/\/[^\s<>()]+)/gi
// SoundChain post: /posts/<24hex>, /post/<id>, /dex/post/<id>, with or without origin
const SC_POST_RE = /(?:soundchain\.io)?\/(?:posts?|dex\/post)\/([a-f0-9]{24})/i
const X_STATUS_RE = /(?:x|twitter)\.com\/[^/\s]+\/status\/(\d+)/i
const X_EMBED_RE = /(?:platform\.twitter\.com|twitter\.com|x\.com)\/[^\s]*[?&]id=(\d+)/i
const IMG_RE = /\.(?:png|jpe?g|webp|gif)(?:[?#]|$)/i

type PostSlim = {
  id: string
  body?: string | null
  mediaLink?: string | null
  mediaThumbnail?: string | null
  uploadedMediaUrl?: string | null
  profile?: { displayName?: string; userHandle?: string; profilePicture?: string; verified?: boolean } | null
  track?: { id: string; title?: string; artist?: string; artworkUrl?: string; saleType?: string; price?: string } | null
}

const postCache = new Map<string, PostSlim | null>()

function SharedPostPreview({ postId }: { postId: string }) {
  const cached = postCache.has(postId) ? postCache.get(postId)! : undefined
  const [post, setPost] = useState<PostSlim | null | undefined>(cached)

  useEffect(() => {
    if (postCache.has(postId)) return
    let cancelled = false
    fetch(`/api/feed/post?id=${encodeURIComponent(postId)}`, { credentials: 'include' })
      .then(r => (r.ok ? r.json() : Promise.reject(new Error('not found'))))
      .then(d => { if (!cancelled) { postCache.set(postId, d.post || null); setPost(d.post || null) } })
      .catch(() => { if (!cancelled) { postCache.set(postId, null); setPost(null) } })
    return () => { cancelled = true }
  }, [postId])

  const href = `/posts/${postId}`

  if (post === undefined) {
    return <div className="mt-2 h-20 rounded-xl border border-white/10 bg-black/20 animate-pulse" />
  }
  if (!post) {
    return (
      <a href={href} className="mt-2 block rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-cyan-300 hover:underline">
        View post on SoundChain →
      </a>
    )
  }

  const track = post.track
  const isX = !!post.mediaLink && (X_STATUS_RE.test(post.mediaLink) || /[?&]id=\d+/.test(post.mediaLink))
  const isVideo = !!post.mediaLink && !isX && canPlayWithReactPlayer(post.mediaLink)
  const flatImg = !track && !post.mediaLink ? (post.uploadedMediaUrl || post.mediaThumbnail) : null

  return (
    <a href={href} className="mt-2 block rounded-xl border border-white/10 bg-black/30 overflow-hidden hover:border-cyan-500/40 transition-colors">
      {/* author */}
      <div className="flex items-center gap-2 px-2.5 pt-2.5 pb-1">
        {post.profile?.profilePicture
          ? <img src={post.profile.profilePicture} className="w-6 h-6 rounded-full object-cover" alt="" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
          : <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500" />}
        <span className="text-xs font-semibold text-white truncate">{post.profile?.displayName || post.profile?.userHandle || 'SoundChain'}</span>
        {post.profile?.verified && <span className="text-cyan-400 text-[11px]">✓</span>}
        <span className="ml-auto text-[9px] uppercase tracking-wider text-cyan-400/70 font-mono shrink-0">SoundChain</span>
      </div>
      {/* body snippet */}
      {post.body && <p className="px-2.5 text-xs text-gray-200 break-words line-clamp-2">{post.body}</p>}
      {/* media — the post's own content */}
      {track ? (
        <div className="flex items-center gap-2.5 m-2.5 mt-2 p-2 rounded-lg bg-black/40 border border-white/5">
          {track.artworkUrl
            ? <img src={track.artworkUrl} className="w-12 h-12 rounded object-cover shrink-0" alt="" />
            : <div className="w-12 h-12 rounded bg-gradient-to-br from-purple-600 to-cyan-600 shrink-0" />}
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-white truncate">{track.title || 'Untitled'}</div>
            {track.artist && <div className="text-[11px] text-gray-400 truncate">{track.artist}</div>}
            <div className="text-[9px] uppercase tracking-wider text-purple-300 font-mono mt-0.5">♪ NFT{track.price ? ` · ${track.price}` : ''}</div>
          </div>
          <span className="text-base text-white/80 shrink-0">▶</span>
        </div>
      ) : isX ? (
        <div className="px-2.5 pb-2.5 pt-1 text-[11px] text-gray-400">𝕏 embedded post — tap to view</div>
      ) : isVideo ? (
        post.mediaThumbnail ? (
          <div className="relative m-2.5 mt-2">
            <img src={post.mediaThumbnail} className="w-full rounded-lg" alt="" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="w-10 h-10 rounded-full bg-black/60 flex items-center justify-center text-white">▶</span>
            </div>
          </div>
        ) : <div className="px-2.5 pb-2.5 pt-1 text-[11px] text-gray-400">▶ video — tap to watch</div>
      ) : flatImg ? (
        <img src={flatImg} className="w-full max-h-64 object-cover" alt="" />
      ) : null}
    </a>
  )
}

/**
 * embedForUrl — given a single URL, return the rich embed node (SoundChain post
 * preview, X tweet, playable video, or image) or null if it isn't embeddable.
 * Shared by MessageBody (DM modal) + DmMessageContent (profile DM thread) so both
 * surfaces render shared posts/NFTs/SCID/embeds identically.
 */
export function embedForUrl(rawUrl: string, key: string): React.ReactNode | null {
  const url = rawUrl.replace(/[.,)\]]+$/, '') // trim trailing punctuation
  const scPost = url.match(SC_POST_RE)
  if (scPost) return <SharedPostPreview key={key} postId={scPost[1]} />
  const xId = url.match(X_STATUS_RE) || url.match(X_EMBED_RE)
  if (xId) return <div key={key} className="mt-2"><NativeTweetCard tweetId={xId[1]} originalUrl={url} /></div>
  if (canPlayWithReactPlayer(url)) {
    return (
      <div key={key} className="mt-2 relative w-full overflow-hidden rounded-lg bg-black" style={{ paddingTop: '56.25%' }}>
        <div className="absolute inset-0">
          <ReactPlayer url={url} width="100%" height="100%" controls />
        </div>
      </div>
    )
  }
  if (IMG_RE.test(url)) return <img key={key} src={url} className="mt-2 max-h-64 w-auto rounded-lg" alt="" />
  return null
}

export function MessageBody({ text, className = 'text-sm' }: { text?: string | null; className?: string }) {
  if (!text) return null

  const segs: React.ReactNode[] = []
  const embeds: React.ReactNode[] = []
  const re = new RegExp(URL_RE.source, 'gi')
  let lastIndex = 0
  let key = 0
  let m: RegExpExecArray | null

  while ((m = re.exec(text)) !== null) {
    const url = m[0].replace(/[.,)\]]+$/, '')
    if (m.index > lastIndex) segs.push(text.slice(lastIndex, m.index))

    const embed = embedForUrl(url, `e${key++}`)
    if (embed) {
      embeds.push(embed)
    } else {
      segs.push(<a key={`l${key++}`} href={url} target="_blank" rel="noopener noreferrer" className="text-cyan-300 underline break-all">{url}</a>)
    }
    lastIndex = m.index + m[0].length
  }
  if (lastIndex < text.length) segs.push(text.slice(lastIndex))

  const hasText = segs.some(s => (typeof s === 'string' ? s.trim().length > 0 : true))

  return (
    <>
      {hasText && <p className={`${className} whitespace-pre-wrap break-words`}>{segs}</p>}
      {embeds}
    </>
  )
}
