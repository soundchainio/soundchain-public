import axios from 'axios';
import { MediaLink } from 'components/PostLinkInput';
import { MediaProvider } from 'types/MediaProvider';

const linksRegex = /\bhttps?:\/\/\S+/gi;

const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?youtu\.?be(?:\.com)?\/?.*(?:watch|embed)?(?:.*v=|v\/|\/)([\w\-_]+)\&?/;

const soundcloudRegex = /soundcloud.com/;
const soundcloudLinkRegex = /(src=")(.*)(")/g;

const spotifyRegex = /spotify.com/;
const spotifyLinkRegex = /(?=track\/).*(?=\?)/g;

const vimeoRegex = /(vimeo.com\/)/;
const vimeoLinkRegex = /(vimeo.com\/)(.*)/g;

const bandcampRegex = /(bandcamp.com\/)/;
const bandcampLinkRegex = /(bandcamp.com\/)(.*)/g;

const normalizeYoutube = (str: string) => {
  let videoId = '';
  if (str.includes('/embed/')) {
    return str;
  }

  if (str.includes('youtu.be/')) {
    videoId = /[^/]*$/.exec(str)![0];
  }

  const urlParams = new URLSearchParams(str.replace('?', '&'));
  if (urlParams.get('v')) {
    videoId = urlParams.get('v')!;
  }

  return `https://www.youtube.com/embed/${videoId}`;
};

const normalizeSoundcloud = async (str: string) => {
  const soundcloudUrl = `https://soundcloud.com/oembed?format=js&url=${str}&iframe=false`;
  const songInfo = await axios(soundcloudUrl);
  if (songInfo.data) {
    // it returns a string '({a: test1, b: test2});'
    // we have to remove the first and last 2 characters from the response to parse as JSON
    const iframeString = JSON.parse(songInfo.data.substring(1).slice(0, -2)).html;
    const src = iframeString.split(soundcloudLinkRegex) || [];
    return src[2];
  }

  return str;
};

const normalizeSpotify = (str: string) => {
  const songId = (str.match(spotifyLinkRegex) || [])[0];
  if (songId[0]) {
    const spotifyUrl = `https://open.spotify.com/embed/${songId}`;
    return spotifyUrl;
  }

  return str;
};

const normalizeVimeo = (str: string) => {
  const videoLinkSplit = str.split(vimeoLinkRegex) || [];
  const videoId = videoLinkSplit[2];
  if (videoId) {
    return `https://player.vimeo.com/video/${videoId}`;
  }
  return str;
};

const normalizeBandcamp = async (str: string) => {
  const res = await axios.post(process.env.NEXT_PUBLIC_API_URL!, {
    query: `query getBandcampLink($url: String!) {
      getBandcampLink(url: $url)
    }`,
    variables: {
      url: str
    }
  }, {
    headers: {
      'Content-Type': 'application/json'
    }
  });

  if (res.data.data.getBandcampLink) {
    return res.data.data.getBandcampLink;
  }

  return str;
};

export const getNormalizedLink = async (str: string) => {
  const link = (str.match(linksRegex) || [])[0];

  if (youtubeRegex.test(link)) return normalizeYoutube(link);
  if (soundcloudRegex.test(link)) return await normalizeSoundcloud(link);
  if (spotifyRegex.test(link)) return normalizeSpotify(link);
  if (vimeoRegex.test(link)) return normalizeVimeo(link);
  if (bandcampRegex.test(link)) return await normalizeBandcamp(link);
};

export const hasLink = (str: string) => {
  return str.match(linksRegex) ? true : false;
};

export const IdentifySource = (str: string) => {
  const ret: MediaLink = {
    value: str,
  };

  if (youtubeRegex.test(str)) ret.type = MediaProvider.YOUTUBE;
  if (soundcloudRegex.test(str)) ret.type = MediaProvider.SOUNDCLOUD;
  if (spotifyRegex.test(str)) ret.type = MediaProvider.SPOTIFY;
  if (vimeoRegex.test(str)) ret.type = MediaProvider.VIMEO;
  if (bandcampRegex.test(str)) ret.type = MediaProvider.BANDCAMP;

  return ret;
};
