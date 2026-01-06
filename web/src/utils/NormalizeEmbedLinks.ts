/* eslint-disable @typescript-eslint/no-non-null-assertion */
import axios from 'axios'
import { MediaLink } from 'components/Post/PostLinkInput'
import { apolloClient } from 'lib/apollo'
import { BandcampLinkDocument } from 'lib/graphql'
import { MediaProvider } from 'types/MediaProvider'

const linksRegex = /\bhttps?:\/\/\S+/gi

// YouTube - support watch, shorts, embed, youtu.be (including already embedded URLs)
const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
const youtubeEmbedUrlRegex = /youtube\.com\/embed\//
const youtubeEmbedRegex = /<iframe[^>]+src="([^"]+youtube[^"]+)"/

// SoundCloud - support regular links and embed codes
const soundcloudRegex = /soundcloud\.com/
const soundcloudEmbedRegex = /<iframe[^>]+src="([^"]+soundcloud[^"]+)"/
const soundcloudLinkRegex = /(src=")(.*)(")/g

// Spotify - support track/album links and embed codes
const spotifyRegex = /spotify\.com/
const spotifyEmbedRegex = /<iframe[^>]+src="([^"]+spotify[^"]+)"/
const spotifyLinkRegex = /(?:open\.spotify\.com\/|spotify:)(track|album|playlist|episode|show)[\/:]([a-zA-Z0-9]+)/

// Vimeo - support regular links and embed codes
const vimeoRegex = /vimeo\.com/
const vimeoEmbedRegex = /<iframe[^>]+src="([^"]+vimeo[^"]+)"/
const vimeoLinkRegex = /vimeo\.com\/(?:video\/)?(\d+)/

// Bandcamp - support links and embed codes
const bandcampRegex = /bandcamp\.com/
const bandcampEmbedRegex = /<iframe[^>]+src="([^"]+bandcamp[^"]+)"/

// Instagram - support posts, reels, stories
const instagramRegex = /instagram\.com/
const instagramEmbedRegex = /<iframe[^>]+src="([^"]+instagram[^"]+)"/
const instagramLinkRegex = /instagram\.com\/(?:p|reel|tv|stories)\/([a-zA-Z0-9_-]+)/

// TikTok - support video links
const tiktokRegex = /tiktok\.com/
const tiktokEmbedRegex = /<blockquote[^>]+cite="([^"]+tiktok[^"]+)"/
const tiktokLinkRegex = /tiktok\.com\/.*\/video\/(\d+)/

// Facebook - support video links
const facebookRegex = /facebook\.com/
const facebookEmbedRegex = /<iframe[^>]+src="([^"]+facebook[^"]+)"/
const facebookLinkRegex = /facebook\.com\/.*\/videos\/(\d+)/

// X (Twitter) - support tweet embeds
const xRegex = /(?:twitter\.com|x\.com)/
const xEmbedRegex = /<blockquote[^>]+href="([^"]+(?:twitter|x)\.com[^"]+)"/
const xLinkRegex = /(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/

// Twitch - support channel and video embeds
const twitchRegex = /twitch\.tv/
const twitchEmbedRegex = /<iframe[^>]+src="([^"]+twitch[^"]+)"/
const twitchChannelRegex = /twitch\.tv\/([a-zA-Z0-9_]+)(?:\/|$)/
const twitchVideoRegex = /twitch\.tv\/videos\/(\d+)/

// Discord - support server widgets and invites
const discordRegex = /discord\.(?:com|gg)/
const discordEmbedRegex = /<iframe[^>]+src="([^"]+discord[^"]+)"/
const discordServerRegex = /discord\.com\/(?:invite\/|servers\/)([a-zA-Z0-9]+)/
const discordInviteRegex = /discord\.gg\/([a-zA-Z0-9]+)/

// Custom HTML embed detector
const customEmbedRegex = /<iframe|<blockquote/

const normalizeYoutube = (str: string) => {
  // Check if it's an iframe embed code first
  const embedMatch = str.match(youtubeEmbedRegex)
  if (embedMatch && embedMatch[1]) {
    // Extract the src URL from iframe, convert to embed format if needed
    const srcUrl = embedMatch[1]
    const match = srcUrl.match(youtubeRegex)
    if (match && match[1]) {
      return `https://www.youtube.com/embed/${match[1]}`
    }
    return srcUrl
  }

  // If it's already an embed URL, return it
  if (str.includes('youtube.com/embed/')) {
    return str
  }

  // Extract video ID from any YouTube URL format
  const match = str.match(youtubeRegex)
  if (match && match[1]) {
    return `https://www.youtube.com/embed/${match[1]}`
  }

  // Fallback for legacy handling
  let videoId = ''
  if (str.includes('youtu.be/')) {
    videoId = /[^/]*$/.exec(str)![0]
  }
  const urlParams = new URLSearchParams(str.replace('?', '&'))
  if (urlParams.get('v')) {
    videoId = urlParams.get('v')!
  }

  return videoId ? `https://www.youtube.com/embed/${videoId}` : str
}

const normalizeSoundcloud = async (str: string) => {
  // Check if it's already an embed code
  const embedMatch = str.match(soundcloudEmbedRegex)
  if (embedMatch && embedMatch[1]) {
    return embedMatch[1]
  }

  // Check if it's already an embed URL
  if (str.includes('w.soundcloud.com/player')) {
    return str
  }

  // Convert regular SoundCloud link to embed
  try {
    const soundcloudUrl = `https://soundcloud.com/oembed?format=js&url=${str}&iframe=false`
    const songInfo = await axios(soundcloudUrl)
    if (songInfo.data) {
      const iframeString = JSON.parse(songInfo.data.substring(1).slice(0, -2)).html
      const src = iframeString.split(soundcloudLinkRegex) || []
      return src[2]
    }
  } catch (error) {
    console.error('SoundCloud embed error:', error)
  }

  return str
}

const normalizeSpotify = (str: string) => {
  // Check if it's already an embed code
  const embedMatch = str.match(spotifyEmbedRegex)
  if (embedMatch && embedMatch[1]) {
    return embedMatch[1]
  }

  // Check if it's already an embed URL
  if (str.includes('open.spotify.com/embed/')) {
    return str
  }

  // Extract type and ID from Spotify URL
  const match = str.match(spotifyLinkRegex)
  if (match && match[1] && match[2]) {
    const type = match[1] // track, album, playlist, etc.
    const id = match[2]
    return `https://open.spotify.com/embed/${type}/${id}`
  }

  return str
}

const normalizeVimeo = (str: string) => {
  // Check if it's already an embed code
  const embedMatch = str.match(vimeoEmbedRegex)
  if (embedMatch && embedMatch[1]) {
    return embedMatch[1]
  }

  // Check if it's already an embed URL
  if (str.includes('player.vimeo.com/video/')) {
    return str
  }

  // Extract video ID from Vimeo URL
  const match = str.match(vimeoLinkRegex)
  if (match && match[1]) {
    return `https://player.vimeo.com/video/${match[1]}`
  }

  return str
}

const normalizeBandcamp = async (str: string) => {
  // Check if it's already an embed code
  const embedMatch = str.match(bandcampEmbedRegex)
  if (embedMatch && embedMatch[1]) {
    return embedMatch[1]
  }

  // Check if it's already an embed URL
  if (str.includes('EmbeddedPlayer')) {
    return str
  }

  // Convert regular Bandcamp link to embed
  try {
    const data = await apolloClient.query({
      query: BandcampLinkDocument,
      variables: { url: str },
    })

    if (data.data.bandcampLink) {
      return data.data.bandcampLink
    }
  } catch (error) {
    console.error('Bandcamp embed error:', error)
  }

  return str
}

const normalizeInstagram = (str: string) => {
  // Check if it's already an embed code
  const embedMatch = str.match(instagramEmbedRegex)
  if (embedMatch && embedMatch[1]) {
    return embedMatch[1]
  }

  // Check if it's already an embed URL
  if (str.includes('instagram.com/embed')) {
    return str
  }

  // Extract post ID from Instagram URL
  const match = str.match(instagramLinkRegex)
  if (match && match[1]) {
    return `https://www.instagram.com/p/${match[1]}/embed/`
  }

  return str
}

const normalizeTikTok = (str: string) => {
  // Check if it's already an embed code (blockquote)
  const embedMatch = str.match(tiktokEmbedRegex)
  if (embedMatch && embedMatch[1]) {
    // TikTok uses oembed, need to convert to embed URL
    const videoMatch = embedMatch[1].match(tiktokLinkRegex)
    if (videoMatch && videoMatch[1]) {
      return `https://www.tiktok.com/embed/v2/${videoMatch[1]}`
    }
  }

  // Check if it's already an embed URL
  if (str.includes('tiktok.com/embed')) {
    return str
  }

  // Extract video ID from TikTok URL
  const match = str.match(tiktokLinkRegex)
  if (match && match[1]) {
    return `https://www.tiktok.com/embed/v2/${match[1]}`
  }

  return str
}

const normalizeFacebook = (str: string) => {
  // Check if it's already an embed code
  const embedMatch = str.match(facebookEmbedRegex)
  if (embedMatch && embedMatch[1]) {
    return embedMatch[1]
  }

  // Check if it's already an embed URL
  if (str.includes('facebook.com/plugins/video')) {
    return str
  }

  // Extract video ID from Facebook URL
  const match = str.match(facebookLinkRegex)
  if (match && match[1]) {
    const encodedUrl = encodeURIComponent(str)
    return `https://www.facebook.com/plugins/video.php?href=${encodedUrl}&show_text=false&width=734`
  }

  return str
}

const normalizeX = (str: string) => {
  // Check if it's already an embed code (blockquote)
  const embedMatch = str.match(xEmbedRegex)
  if (embedMatch && embedMatch[1]) {
    // X/Twitter embeds require their widget script, return the tweet URL for iframe embed
    const tweetUrl = embedMatch[1]
    return `https://platform.twitter.com/embed/Tweet.html?id=${tweetUrl.match(xLinkRegex)?.[1]}`
  }

  // Check if it's already an embed URL
  if (str.includes('platform.twitter.com/embed')) {
    return str
  }

  // Extract tweet ID from X/Twitter URL
  const match = str.match(xLinkRegex)
  if (match && match[1]) {
    return `https://platform.twitter.com/embed/Tweet.html?id=${match[1]}`
  }

  return str
}

const normalizeTwitch = (str: string) => {
  // Check if it's already an embed code
  const embedMatch = str.match(twitchEmbedRegex)
  if (embedMatch && embedMatch[1]) {
    return embedMatch[1]
  }

  // Check if it's already an embed URL
  if (str.includes('player.twitch.tv')) {
    return str
  }

  // Extract video ID from Twitch video URL
  const videoMatch = str.match(twitchVideoRegex)
  if (videoMatch && videoMatch[1]) {
    return `https://player.twitch.tv/?video=${videoMatch[1]}&parent=${typeof window !== 'undefined' ? window.location.hostname : 'soundchain.io'}&autoplay=false`
  }

  // Extract channel name from Twitch channel URL
  const channelMatch = str.match(twitchChannelRegex)
  if (channelMatch && channelMatch[1]) {
    const channel = channelMatch[1]
    // Exclude 'videos' as it's not a channel name
    if (channel !== 'videos') {
      return `https://player.twitch.tv/?channel=${channel}&parent=${typeof window !== 'undefined' ? window.location.hostname : 'soundchain.io'}&autoplay=false`
    }
  }

  return str
}

const normalizeDiscord = (str: string) => {
  // Check if it's already an embed code
  const embedMatch = str.match(discordEmbedRegex)
  if (embedMatch && embedMatch[1]) {
    return embedMatch[1]
  }

  // Check if it's already an embed URL
  if (str.includes('discord.com/widget')) {
    return str
  }

  // Extract server ID from Discord server URL
  const serverMatch = str.match(discordServerRegex)
  if (serverMatch && serverMatch[1]) {
    return `https://discord.com/widget?id=${serverMatch[1]}&theme=dark`
  }

  // Extract invite code from discord.gg URL
  const inviteMatch = str.match(discordInviteRegex)
  if (inviteMatch && inviteMatch[1]) {
    // For invites, we'll use the invite widget (requires converting invite to server ID on backend)
    // For now, return a discord.com URL that shows the invite
    return `https://discord.com/invite/${inviteMatch[1]}`
  }

  return str
}

const normalizeCustomHTML = (str: string) => {
  // Extract src from iframe or embed code
  const iframeMatch = str.match(/<iframe[^>]+src="([^"]+)"/)
  if (iframeMatch && iframeMatch[1]) {
    return iframeMatch[1]
  }

  // If it's already a URL, return it
  if (str.startsWith('http')) {
    return str
  }

  return str
}

export const getNormalizedLink = async (str: string) => {
  // First, remove any markdown image syntax to avoid matching emote/sticker URLs
  // Pattern: ![anything](url) - used for emotes/stickers
  const strWithoutEmotes = str.replace(/!\[[^\]]*\]\([^)]+\)/g, '')

  // Check if it's custom HTML embed code first
  if (customEmbedRegex.test(strWithoutEmotes)) {
    // Try to identify the platform from the embed code
    if (youtubeRegex.test(strWithoutEmotes)) return normalizeYoutube(strWithoutEmotes)
    if (soundcloudRegex.test(strWithoutEmotes)) return await normalizeSoundcloud(strWithoutEmotes)
    if (spotifyRegex.test(strWithoutEmotes)) return normalizeSpotify(strWithoutEmotes)
    if (vimeoRegex.test(strWithoutEmotes)) return normalizeVimeo(strWithoutEmotes)
    if (bandcampRegex.test(strWithoutEmotes)) return await normalizeBandcamp(strWithoutEmotes)
    if (instagramRegex.test(strWithoutEmotes)) return normalizeInstagram(strWithoutEmotes)
    if (tiktokRegex.test(strWithoutEmotes)) return normalizeTikTok(strWithoutEmotes)
    if (facebookRegex.test(strWithoutEmotes)) return normalizeFacebook(strWithoutEmotes)
    if (xRegex.test(strWithoutEmotes)) return normalizeX(strWithoutEmotes)
    if (twitchRegex.test(strWithoutEmotes)) return normalizeTwitch(strWithoutEmotes)
    if (discordRegex.test(strWithoutEmotes)) return normalizeDiscord(strWithoutEmotes)

    // If we can't identify it, treat as custom HTML
    return normalizeCustomHTML(strWithoutEmotes)
  }

  const link = (strWithoutEmotes.match(linksRegex) || [])[0]

  if (!link) return undefined

  if (youtubeRegex.test(link)) return normalizeYoutube(link)
  if (soundcloudRegex.test(link)) return await normalizeSoundcloud(link)
  if (spotifyRegex.test(link)) return normalizeSpotify(link)
  if (vimeoRegex.test(link)) return normalizeVimeo(link)
  if (bandcampRegex.test(link)) return await normalizeBandcamp(link)
  if (instagramRegex.test(link)) return normalizeInstagram(link)
  if (tiktokRegex.test(link)) return normalizeTikTok(link)
  if (facebookRegex.test(link)) return normalizeFacebook(link)
  if (xRegex.test(link)) return normalizeX(link)
  if (twitchRegex.test(link)) return normalizeTwitch(link)
  if (discordRegex.test(link)) return normalizeDiscord(link)

  return link
}

export const hasLink = (str: string) => {
  // First, remove any markdown image syntax to avoid matching emote URLs
  // Pattern: ![anything](url) - used for emotes/stickers
  const strWithoutEmotes = str.replace(/!\[[^\]]*\]\([^)]+\)/g, '')
  return strWithoutEmotes.match(linksRegex) ? true : false
}

export const IdentifySource = (str: string) => {
  const ret: MediaLink = {
    value: str,
  }

  // Check for YouTube (including embed URLs that don't have video ID in standard format)
  if (youtubeRegex.test(str) || youtubeEmbedUrlRegex.test(str)) ret.type = MediaProvider.YOUTUBE
  if (soundcloudRegex.test(str)) ret.type = MediaProvider.SOUNDCLOUD
  if (spotifyRegex.test(str)) ret.type = MediaProvider.SPOTIFY
  if (vimeoRegex.test(str)) ret.type = MediaProvider.VIMEO
  if (bandcampRegex.test(str)) ret.type = MediaProvider.BANDCAMP
  if (instagramRegex.test(str)) ret.type = MediaProvider.INSTAGRAM
  if (tiktokRegex.test(str)) ret.type = MediaProvider.TIKTOK
  if (facebookRegex.test(str)) ret.type = MediaProvider.FACEBOOK
  if (xRegex.test(str)) ret.type = MediaProvider.X
  if (twitchRegex.test(str)) ret.type = MediaProvider.TWITCH
  if (discordRegex.test(str)) ret.type = MediaProvider.DISCORD
  if (customEmbedRegex.test(str) && !ret.type) ret.type = MediaProvider.CUSTOM_HTML

  return ret
}

//Media providers that React player can Lazy load with thumbnail art: https://www.npmjs.com/package/react-player
export const hasLazyLoadWithThumbnailSupport = (mediaUrl: string) => {
  const source = IdentifySource(mediaUrl).type
  return (
    source === MediaProvider.YOUTUBE ||
    source === MediaProvider.VIMEO ||
    source === MediaProvider.FACEBOOK
  )
}

// Media providers that ReactPlayer can play (includes audio platforms)
export const canPlayWithReactPlayer = (mediaUrl: string) => {
  const source = IdentifySource(mediaUrl).type
  return (
    source === MediaProvider.YOUTUBE ||
    source === MediaProvider.VIMEO ||
    source === MediaProvider.FACEBOOK ||
    source === MediaProvider.SOUNDCLOUD ||
    source === MediaProvider.SPOTIFY ||
    source === MediaProvider.TWITCH
  )
}
