/* eslint-disable @typescript-eslint/no-non-null-assertion */
import axios from 'axios'
import { MediaLink } from 'components/Post/PostLinkInput'
import { apolloClient } from 'lib/apollo'
import { BandcampLinkDocument } from 'lib/graphql'
import { MediaProvider } from 'types/MediaProvider'

const linksRegex = /\bhttps?:\/\/\S+/gi

const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?youtu\.?be(?:\.com)?\/?.*(?:watch|embed)?(?:.*v=|v\/|\/)([\w\-_]+)\&?/

const soundcloudRegex = /soundcloud.com/
const soundcloudLinkRegex = /(src=")(.*)(")/g

const spotifyRegex = /spotify.com/
const spotifyLinkRegex =
  /^(?:spotify:|(?:https?:\/\/(?:open|play)\.spotify\.com\/))(?:embed)?\/?(album|track)(?::|\/)((?:[0-9a-zA-Z]){22})/

const vimeoRegex = /(vimeo.com\/)/
const vimeoLinkRegex = /(vimeo.com\/)(.*)/g

const bandcampRegex = /(bandcamp.com\/)/

const normalizeYoutube = (str: string) => {
  let videoId = ''
  if (str.includes('/embed/')) {
    return str
  }

  if (str.includes('youtu.be/')) {
    videoId = /[^/]*$/.exec(str)![0]
  }

  const urlParams = new URLSearchParams(str.replace('?', '&'))
  if (urlParams.get('v')) {
    videoId = urlParams.get('v')!
  }

  return `https://www.youtube.com/embed/${videoId}`
}

const normalizeSoundcloud = async (str: string) => {
  const soundcloudUrl = `https://soundcloud.com/oembed?format=js&url=${str}&iframe=false`
  const songInfo = await axios(soundcloudUrl)
  if (songInfo.data) {
    // it returns a string '({a: test1, b: test2});'
    // we have to remove the first and last 2 characters from the response to parse as JSON
    const iframeString = JSON.parse(songInfo.data.substring(1).slice(0, -2)).html
    const src = iframeString.split(soundcloudLinkRegex) || []
    return src[2]
  }

  return str
}

const normalizeSpotify = (str: string) => {
  const spotifyUrlData = str.match(spotifyLinkRegex) || []
  const trackId = spotifyUrlData[2].trim()

  if (trackId) {
    const spotifyUrl = `https://open.spotify.com/embed/track/${trackId}`
    return spotifyUrl
  }

  return str
}

const normalizeVimeo = (str: string) => {
  const videoLinkSplit = str.split(vimeoLinkRegex) || []
  const videoId = videoLinkSplit[2]
  if (videoId) {
    return `https://player.vimeo.com/video/${videoId}`
  }
  return str
}

const normalizeBandcamp = async (str: string) => {
  if (str.includes('EmbeddedPlayer')) {
    return str
  }

  const data = await apolloClient.query({
    query: BandcampLinkDocument,
    variables: { url: str },
  })

  if (data.data.bandcampLink) {
    return data.data.bandcampLink
  }

  return str
}

export const getNormalizedLink = async (str: string) => {
  const link = (str.match(linksRegex) || [])[0]

  if (!link) return undefined

  if (youtubeRegex.test(link)) return normalizeYoutube(link)
  if (soundcloudRegex.test(link)) return await normalizeSoundcloud(link)
  if (spotifyRegex.test(link)) return normalizeSpotify(link)
  if (vimeoRegex.test(link)) return normalizeVimeo(link)
  if (bandcampRegex.test(link)) return await normalizeBandcamp(link)
}

export const hasLink = (str: string) => {
  return str.match(linksRegex) ? true : false
}

export const IdentifySource = (str: string) => {
  const ret: MediaLink = {
    value: str,
  }

  if (youtubeRegex.test(str)) ret.type = MediaProvider.YOUTUBE
  if (soundcloudRegex.test(str)) ret.type = MediaProvider.SOUNDCLOUD
  if (spotifyRegex.test(str)) ret.type = MediaProvider.SPOTIFY
  if (vimeoRegex.test(str)) ret.type = MediaProvider.VIMEO
  if (bandcampRegex.test(str)) ret.type = MediaProvider.BANDCAMP

  return ret
}

//Media providers that React player can Lazy load with thumbnail art: https://www.npmjs.com/package/react-player
export const hasLazyLoadWithThumbnailSupport = (mediaUrl: string) => {
  return (
    IdentifySource(mediaUrl).type === MediaProvider.YOUTUBE || IdentifySource(mediaUrl).type === MediaProvider.VIMEO
  )
}
