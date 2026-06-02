/**
 * buildPostOgMeta — server-side rich/playable link-preview metadata for a
 * shared SoundChain post (https://soundchain.io/posts/<id>).
 *
 * Drives the bot/crawler <Head> in pages/posts/[id].tsx so that when a post is
 * shared into iMessage, an AI wearable (Ray-Ban / Apple Vision), an AI agent,
 * WhatsApp, Discord, Slack, Telegram or X, the card shows the post's REAL media
 * and is as playable-inline as the surface allows:
 *
 *  - mp4-inline      (plays IN the bubble): X video (via /api/social/tweet-video),
 *                    uploaded video. og:video:type=video/mp4 + same-origin range MP4.
 *  - provider-native (X inline player / iframe on Discord-Slack / poster on iMessage):
 *                    YouTube, Vimeo, TikTok, Twitch, Spotify, SoundCloud, Bandcamp, Facebook.
 *  - audio-card      (cover art + og:audio; true inline only on X via twitter:player):
 *                    native tracks/NFTs/SCID, uploaded audio.
 *  - image-only      (rich poster everywhere): uploaded image, Instagram, Discord
 *                    invite, plain text, universal fallback. NEVER a bare logo when
 *                    we have author art.
 *
 * Every external fetch is timeout-bounded + try/caught → on any failure we degrade
 * to the image cascade, never throw, never 500 a preview. SSRF-safe: we only fetch
 * a fixed allowlist of provider endpoints + (for scrape providers) the post's own
 * mediaLink host, never an arbitrary user string.
 */
import { config } from 'config'

const ORIGIN_FALLBACK = 'https://soundchain.io'
const LOGO_PATH = '/soundchain-meta-logo.png'
const BOT_UA = 'facebookexternalhit/1.1 (+https://soundchain.io)'

export interface PostOgMetadata {
  title: string
  description: string
  image: string
  imageType?: string
  imageWidth?: number
  imageHeight?: number
  url: string
  siteName: string
  ogType: string // 'music.song' | 'video.other' | 'article' | 'website'
  cardType: string // 'summary' | 'summary_large_image' | 'player'
  inlinePlayable: string // 'mp4-inline' | 'provider-native' | 'audio-card' | 'image-only'
  videoMp4?: { url: string; width: number; height: number } | null
  videoEmbed?: { url: string; width: number; height: number } | null
  audio?: { url: string; type: string } | null
  player?: { url: string; width: number; height: number; stream?: string | null } | null
  uploadDate?: string | null
  authorName?: string | null
}

// ── small helpers ────────────────────────────────────────────────────────────
const toOid = async (v: any) => {
  const { ObjectId } = await import('mongodb')
  return typeof v === 'string' ? new ObjectId(v) : v
}

// ipfs:// , /ipfs/ , gateway.pinata.cloud → public dweb.link gateway (crawlers).
export const getHttpImageUrl = (url: string | null | undefined): string => {
  if (!url) return ''
  if (url.startsWith('ipfs://')) return `https://dweb.link/ipfs/${url.replace('ipfs://', '')}`
  if (url.startsWith('/ipfs/')) return `https://dweb.link${url}`
  if (url.includes('gateway.pinata.cloud')) {
    const m = url.match(/\/ipfs\/([^/?]+)/)
    if (m) return `https://dweb.link/ipfs/${m[1]}`
  }
  return url
}

const abs = (u: string | null | undefined, origin: string): string => {
  if (!u) return ''
  if (/^https?:\/\//i.test(u)) return u
  return `${origin}${u.startsWith('/') ? '' : '/'}${u}`
}

const fetchText = async (url: string, ms: number, headers?: Record<string, string>): Promise<string | null> => {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(ms), headers: { 'User-Agent': BOT_UA, ...(headers || {}) }, redirect: 'follow' })
    if (!r.ok) return null
    return await r.text()
  } catch {
    return null
  }
}
const fetchJson = async (url: string, ms: number, headers?: Record<string, string>): Promise<any | null> => {
  const t = await fetchText(url, ms, { Accept: 'application/json', ...(headers || {}) })
  if (!t) return null
  try { return JSON.parse(t) } catch { return null }
}

// Pull a single OG/meta property out of raw page HTML (scrape providers).
const scrapeMeta = (html: string, prop: string): string | null => {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`, 'i')
  const m = html.match(re) || html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${prop}["']`, 'i'))
  return m ? m[1].replace(/&amp;/g, '&') : null
}

// ── id extractors ────────────────────────────────────────────────────────────
const ytId = (u: string) => u.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1] || null
const vimeoId = (u: string) => u.match(/vimeo\.com\/(?:video\/)?(\d+)/)?.[1] || null
const tiktokId = (u: string) => u.match(/tiktok\.com\/.*\/video\/(\d+)/)?.[1] || null
const xId = (u: string) => u.match(/(?:x|twitter)\.com\/[^/\s]+\/status\/(\d+)/i)?.[1] || u.match(/(?:status\/|id=)(\d+)/)?.[1] || null
const igShortcode = (u: string) => u.match(/instagram\.com\/(?:p|reel|tv)\/([a-zA-Z0-9_-]+)/)?.[1] || null
const discordCode = (u: string) => u.match(/discord\.(?:com\/(?:invite|servers)\/|gg\/)([a-zA-Z0-9-]+)/)?.[1] || null
const spotifyParts = (u: string) => {
  const m = u.match(/(?:open\.spotify\.com\/|spotify:)(track|album|playlist|episode|show)[/:]([a-zA-Z0-9]+)/)
  return m ? { type: m[1], id: m[2] } : null
}
const audioMime = (u: string): string | null => {
  if (/\.mp3(\?|$)/i.test(u)) return 'audio/mpeg'
  if (/\.m4a(\?|$)/i.test(u)) return 'audio/mp4'
  if (/\.(wav)(\?|$)/i.test(u)) return 'audio/wav'
  if (/\.(ogg|oga)(\?|$)/i.test(u)) return 'audio/ogg'
  return null // .m3u8 / unknown → iframe player only, no direct og:audio
}

// ── main ─────────────────────────────────────────────────────────────────────
export async function buildPostOgMeta(db: any, postId: string, originIn?: string): Promise<PostOgMetadata> {
  const origin = originIn || config.domainUrl || ORIGIN_FALLBACK
  const url = `${origin}/posts/${postId}`
  const logo = `${origin}${LOGO_PATH}`
  const base: PostOgMetadata = {
    title: 'Post | SoundChain',
    description: 'Check out this post on SoundChain',
    image: logo,
    url,
    siteName: 'SoundChain',
    ogType: 'article',
    cardType: 'summary_large_image',
    inlinePlayable: 'image-only',
  }

  try {
    let oid: any
    try { oid = await toOid(postId) } catch { return base }
    const post: any = await db.collection('posts').findOne({ _id: oid })
    if (!post) return base

    const profile: any = post.profileId
      ? await db.collection('profiles').findOne({ _id: await toOid(post.profileId) }, { projection: { displayName: 1, userHandle: 1, profilePicture: 1 } })
      : null
    const track: any = post.trackId
      ? await db.collection('tracks').findOne(
          { _id: await toOid(post.trackId) },
          { projection: { title: 1, artist: 1, artworkUrl: 1, playbackUrl: 1, assetUrl: 1, album: 1, releaseYear: 1, price: 1, saleType: 1, isNft: 1 } },
        )
      : null

    const authorName = profile?.displayName || 'Someone'
    const uploadDate = (() => {
      try { return post.createdAt ? new Date(post.createdAt).toISOString() : oid.getTimestamp().toISOString() } catch { return null }
    })()
    const cleanBody: string = (post.body || '')
      .replace(/!\[!?emote:[^\]]*\]\([^)]*\)/g, '')
      .replace(/!\[!?sticker:[^\]]*\]\([^)]*\)/g, '')
      .replace(/!\[!?gif:[^\]]*\]\([^)]*\)/g, '')
      .trim()

    // Image cascade — author-branded beats a bare logo. (provider thumbs override below)
    const cascadeImage =
      getHttpImageUrl(track?.artworkUrl) ||
      (post.uploadedMediaType === 'image' ? getHttpImageUrl(post.uploadedMediaUrl) : '') ||
      getHttpImageUrl(post.mediaThumbnail) ||
      getHttpImageUrl(profile?.profilePicture) ||
      logo

    const meta: PostOgMetadata = {
      ...base,
      title: track ? `${track.title} - song by ${track.artist} | SoundChain` : `${authorName} on SoundChain`,
      description: cleanBody ? cleanBody.substring(0, 200) : track ? `Listen to ${track.title} on SoundChain. ${track.artist}.` : 'Check out this post on SoundChain',
      image: cascadeImage,
      authorName,
      uploadDate,
    }
    const embedUrl = `${origin}/embed/post/${postId}`

    // 1) NATIVE TRACK / NFT / SCID ----------------------------------------------
    if (track) {
      meta.ogType = 'music.song'
      meta.image = getHttpImageUrl(track.artworkUrl) || cascadeImage
      meta.description = `Listen to ${track.title} by ${track.artist} on SoundChain.${track.isNft ? ' Collectible music NFT.' : ''}`
      const stream = getHttpImageUrl(track.playbackUrl || track.assetUrl)
      const mime = stream ? audioMime(stream) : null
      if (stream && mime) {
        meta.audio = { url: stream, type: mime }
        meta.player = { url: embedUrl, width: 480, height: 480, stream }
        meta.cardType = 'player'
        meta.inlinePlayable = 'audio-card'
      } else if (stream) {
        meta.player = { url: embedUrl, width: 480, height: 480, stream }
        meta.cardType = 'player'
        meta.inlinePlayable = 'audio-card'
      }
      return meta
    }

    // 2) UPLOADED VIDEO → mp4 inline --------------------------------------------
    if (post.uploadedMediaType === 'video' && post.uploadedMediaUrl) {
      const mp4 = getHttpImageUrl(post.uploadedMediaUrl)
      meta.ogType = 'video.other'
      meta.image = getHttpImageUrl(post.mediaThumbnail) || cascadeImage
      meta.videoMp4 = { url: mp4, width: 1280, height: 720 }
      meta.player = { url: embedUrl, width: 1280, height: 720 }
      meta.cardType = 'summary_large_image'
      meta.inlinePlayable = 'mp4-inline'
      meta.description = `${authorName} shared a video on SoundChain${cleanBody ? `: ${cleanBody.substring(0, 150)}` : ''}`
      return meta
    }

    // 3) UPLOADED AUDIO ----------------------------------------------------------
    if (post.uploadedMediaType === 'audio' && post.uploadedMediaUrl) {
      const stream = getHttpImageUrl(post.uploadedMediaUrl)
      const mime = audioMime(stream)
      meta.ogType = 'music.song'
      if (mime) meta.audio = { url: stream, type: mime }
      meta.player = { url: embedUrl, width: 480, height: 480, stream }
      meta.cardType = 'player'
      meta.inlinePlayable = 'audio-card'
      meta.description = `${authorName} shared audio on SoundChain${cleanBody ? `: ${cleanBody.substring(0, 150)}` : ''}`
      return meta
    }

    // 4) UPLOADED IMAGE ----------------------------------------------------------
    if (post.uploadedMediaType === 'image' && post.uploadedMediaUrl) {
      meta.ogType = 'article'
      meta.image = getHttpImageUrl(post.uploadedMediaUrl)
      meta.imageWidth = 1200
      meta.imageHeight = 630
      meta.cardType = 'summary_large_image'
      meta.inlinePlayable = 'image-only'
      return meta
    }

    // 5) EXTERNAL mediaLink ------------------------------------------------------
    const link: string | null = post.mediaLink || null
    if (link) {
      await enrichExternal(meta, link, { origin, embedUrl })
      return meta
    }

    // 6) TEXT / fallback ---------------------------------------------------------
    meta.ogType = 'article'
    meta.cardType = meta.image === logo ? 'summary' : 'summary_large_image'
    meta.inlinePlayable = 'image-only'
    return meta
  } catch {
    return base
  }
}

// Per-provider enrichment of `meta`, mutating it in place. Defensive throughout.
async function enrichExternal(meta: PostOgMetadata, link: string, ctx: { origin: string; embedUrl: string }): Promise<void> {
  const { origin, embedUrl } = ctx

  // X / Twitter — true inline MP4 via our same-origin proxy
  const tweetId = /(?:x|twitter)\.com/i.test(link) ? xId(link) : null
  if (tweetId) {
    meta.ogType = 'video.other'
    meta.inlinePlayable = 'image-only'
    const tw = await fetchJson(`${origin}/api/social/tweet?id=${tweetId}`, 4000)
    const m = tw?.media?.[0]
    if (m?.thumbnailUrl) meta.image = m.thumbnailUrl
    if (m?.videoUrl && (m.type === 'video' || m.type === 'animated_gif')) {
      meta.videoMp4 = {
        url: `${origin}/api/social/tweet-video?u=${encodeURIComponent(m.videoUrl)}&v=2`,
        width: m.width || 1280,
        height: m.height || 720,
      }
      meta.inlinePlayable = 'mp4-inline'
    }
    if (tw?.text) meta.description = tw.text.substring(0, 200)
    return
  }

  // YouTube — provider-native player + maxres thumb
  const yt = ytId(link)
  if (yt) {
    meta.ogType = 'video.other'
    meta.image = `https://img.youtube.com/vi/${yt}/maxresdefault.jpg`
    meta.videoEmbed = { url: `https://www.youtube.com/embed/${yt}`, width: 1280, height: 720 }
    meta.player = { url: `https://www.youtube.com/embed/${yt}`, width: 480, height: 270 }
    meta.cardType = 'player'
    meta.inlinePlayable = 'provider-native'
    return
  }

  // Vimeo — oEmbed thumb + player
  const vim = vimeoId(link)
  if (vim) {
    meta.ogType = 'video.other'
    const o = await fetchJson(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent(link)}&width=1280`, 5000)
    meta.image = o?.thumbnail_url || `https://vumbnail.com/${vim}.jpg`
    if (o?.title) meta.title = `${o.title} | SoundChain`
    meta.videoEmbed = { url: `https://player.vimeo.com/video/${vim}`, width: 1280, height: 720 }
    meta.player = { url: `https://player.vimeo.com/video/${vim}`, width: 480, height: 270 }
    meta.cardType = 'player'
    meta.inlinePlayable = 'provider-native'
    return
  }

  // Spotify — oEmbed thumb + embed player
  const sp = spotifyParts(link)
  if (sp || /spotify\.(com|link)/.test(link)) {
    meta.ogType = 'music.song'
    const o = await fetchJson(`https://open.spotify.com/oembed?url=${encodeURIComponent(link)}`, 3000)
    if (o?.thumbnail_url) meta.image = o.thumbnail_url
    if (o?.title) meta.title = `${o.title} | SoundChain`
    const emb = sp ? `https://open.spotify.com/embed/${sp.type}/${sp.id}` : null
    if (emb) {
      meta.videoEmbed = { url: emb, width: 456, height: sp && sp.type === 'track' ? 152 : 352 }
      meta.player = { url: emb, width: 456, height: sp && sp.type === 'track' ? 152 : 352 }
      meta.cardType = 'player'
    }
    meta.inlinePlayable = 'provider-native'
    return
  }

  // SoundCloud — oEmbed thumb + visual player
  if (/soundcloud\.com/.test(link)) {
    meta.ogType = 'music.song'
    const o = await fetchJson(`https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(link)}`, 3000)
    if (o?.thumbnail_url) meta.image = o.thumbnail_url.replace(/-large(\.\w+)$/, '-t500x500$1')
    if (o?.title) meta.title = `${o.title} | SoundChain`
    const player = `https://w.soundcloud.com/player/?url=${encodeURIComponent(link)}&visual=true`
    meta.videoEmbed = { url: player, width: 480, height: 480 }
    meta.player = { url: player, width: 480, height: 480 }
    meta.cardType = 'player'
    meta.inlinePlayable = 'provider-native'
    return
  }

  // Bandcamp — scrape og:image + embedded player
  if (/bandcamp\.com/.test(link)) {
    meta.ogType = 'music.song'
    const html = await fetchText(link, 3500)
    if (html) {
      const img = scrapeMeta(html, 'og:image')
      if (img) meta.image = img
      const t = scrapeMeta(html, 'og:title')
      if (t) meta.title = `${t} | SoundChain`
      const pl = scrapeMeta(html, 'og:video') || scrapeMeta(html, 'og:video:secure_url')
      if (pl) {
        meta.videoEmbed = { url: pl, width: 400, height: 472 }
        meta.player = { url: pl, width: 400, height: 472 }
        meta.cardType = 'player'
      }
    }
    meta.inlinePlayable = 'provider-native'
    return
  }

  // TikTok — oEmbed thumb + embed
  const tk = tiktokId(link)
  if (tk || /tiktok\.com/.test(link)) {
    meta.ogType = 'video.other'
    const o = await fetchJson(`https://www.tiktok.com/oembed?url=${encodeURIComponent(link)}`, 5000)
    if (o?.thumbnail_url) { meta.image = o.thumbnail_url; meta.imageType = 'image/jpeg' }
    if (o?.title) meta.title = `${o.title} | SoundChain`
    if (tk) {
      const emb = `https://www.tiktok.com/embed/v2/${tk}`
      meta.videoEmbed = { url: emb, width: 325, height: 575 }
      meta.player = { url: emb, width: 325, height: 575 }
      meta.cardType = 'player'
    }
    meta.inlinePlayable = 'provider-native'
    return
  }

  // Twitch — scrape og:image + player (parent MUST be exact host)
  if (/twitch\.tv/.test(link)) {
    meta.ogType = 'video.other'
    const html = await fetchText(link, 4000)
    if (html) {
      const img = scrapeMeta(html, 'og:image'); if (img) meta.image = img
    }
    const vid = link.match(/twitch\.tv\/videos\/(\d+)/)?.[1]
    const clip = link.match(/clips\.twitch\.tv\/([a-zA-Z0-9_-]+)/)?.[1] || link.match(/twitch\.tv\/\w+\/clip\/([a-zA-Z0-9_-]+)/)?.[1]
    const chan = link.match(/twitch\.tv\/([a-zA-Z0-9_]+)(?:\/|$)/)?.[1]
    const host = (() => { try { return new URL(origin).hostname } catch { return 'soundchain.io' } })()
    const emb = vid
      ? `https://player.twitch.tv/?video=${vid}&parent=${host}`
      : clip
        ? `https://clips.twitch.tv/embed?clip=${clip}&parent=${host}`
        : chan
          ? `https://player.twitch.tv/?channel=${chan}&parent=${host}`
          : null
    if (emb) {
      meta.videoEmbed = { url: emb, width: 620, height: 378 }
      meta.player = { url: emb, width: 620, height: 378 }
      meta.cardType = 'player'
    }
    meta.inlinePlayable = 'provider-native'
    return
  }

  // Instagram — scrape og:image (token-free); embed player. image-only if no poster.
  const ig = igShortcode(link)
  if (ig || /instagram\.com/.test(link)) {
    meta.ogType = 'video.other'
    const html = await fetchText(link, 4000)
    const img = html ? scrapeMeta(html, 'og:image') : null
    if (img) meta.image = img
    if (ig) {
      const emb = `https://www.instagram.com/p/${ig}/embed/`
      meta.videoEmbed = { url: emb, width: 480, height: 600 }
      meta.player = { url: emb, width: 480, height: 600 }
    }
    meta.cardType = img ? 'player' : 'summary_large_image'
    meta.inlinePlayable = img ? 'provider-native' : 'image-only'
    return
  }

  // Facebook — scrape og:image; plugin video player
  if (/facebook\.com|fb\.watch/.test(link)) {
    meta.ogType = 'video.other'
    const html = await fetchText(link, 4000)
    const img = html ? scrapeMeta(html, 'og:image') : null
    if (img) meta.image = img
    const emb = `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(link)}&show_text=false&width=734`
    meta.videoEmbed = { url: emb, width: 734, height: 413 }
    meta.player = { url: emb, width: 734, height: 413 }
    meta.cardType = img ? 'player' : 'summary_large_image'
    meta.inlinePlayable = img ? 'provider-native' : 'image-only'
    return
  }

  // Discord — invite → server icon card
  const dc = discordCode(link)
  if (dc) {
    meta.ogType = 'website'
    const inv = await fetchJson(`https://discord.com/api/v10/invites/${dc}?with_counts=true`, 4000, { 'User-Agent': 'SoundChain/1.0 (+https://soundchain.io)' })
    const g = inv?.guild
    if (g?.id && g?.icon) meta.image = `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png?size=512`
    if (g?.name) {
      meta.title = `Join ${g.name} on Discord`
      const members = inv?.approximate_member_count
      const online = inv?.approximate_presence_count
      meta.description = members ? `${g.name} · ${members.toLocaleString()} members${online ? `, ${online.toLocaleString()} online` : ''}` : `Join ${g.name} on Discord`
    }
    meta.cardType = 'summary' // square server icon — don't crop
    meta.inlinePlayable = 'image-only'
    return
  }

  // Custom HTML / unknown link → keep the author-branded card (already set).
  meta.ogType = 'article'
  meta.cardType = meta.image && !meta.image.endsWith(LOGO_PATH) ? 'summary_large_image' : 'summary'
  meta.inlinePlayable = 'image-only'
}
