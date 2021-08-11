import axios from 'axios';

const linksRegex = /\bhttps?:\/\/\S+/gi;
const spotifyRegex = /(?<=track\/).*(?=\?)/g;
const soundcloudRegex = /(?<=src=\").*(?=\">)/g;
const vimeoRegex = /(?<=vimeo.com\/).*$/g;

const normalizeYoutube = (str: string) => {
  if (str) return str.replace('/watch?v=', '/embed/');
};

const normalizeSoundcloud = async (str: string) => {
  if (str && str.includes('soundcloud.com/')) {
    const soundcloudUrl = 'http://soundcloud.com/oembed?format=js&url=' + str + '&iframe=false';
    const songInfo = await axios(soundcloudUrl);
    if (songInfo.data) {
      // it returns a string '({a: test1, b: test2});'
      // we have to remove the first and last 2 characters from the response to parse as JSON
      const iframeString = JSON.parse(songInfo.data.substring(1).slice(0, -2)).html;
      const src = iframeString.match(soundcloudRegex) || [];
      if (src[0]) return src[0];
    }
  }

  return str;
};

const normalizeSpotify = async (str: string) => {
  if (str && str.includes('open.spotify.com/')) {
    const songId = str.match(spotifyRegex) || [];
    if (songId[0]) {
      const spotifyUrl = 'https://open.spotify.com/embed/track/' + songId[0];
      return spotifyUrl;
    }
  }
  return str;
};

const normalizeVimeo = async (str: string) => {
  if (str && str.includes('vimeo.com/')) {
    const videoId = str.match(vimeoRegex) || [];
    const vimeoUrl = 'https://player.vimeo.com/video/' + videoId[0];
    return vimeoUrl;
  }
  return str;
};

const normalizeAll = async (str: string) => {
  let text = normalizeYoutube(str);
  text = await normalizeSoundcloud(text || '');
  text = await normalizeSpotify(text || '');
  text = await normalizeVimeo(text || '');
  return text;
};

export const getNormalizedLink = async (str: string) => {
  const links = str.match(linksRegex) || [];
  return await normalizeAll(links[0]);
};
