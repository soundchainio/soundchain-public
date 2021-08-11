import axios from 'axios';

const linksRegex = /\bhttps?:\/\/\S+/gi;

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
      const src = iframeString.match(/(?<=src=\").*(?=\">)/g) || [];
      return src[0];
    }
  }

  return str;
};

const normalizeAll = async (str: string) => {
  let text = normalizeYoutube(str);
  text = await normalizeSoundcloud(text || '');
  return text;
};

export const getNormalizedLink = async (str: string) => {
  const links = str.match(linksRegex) || [];
  return await normalizeAll(links[0]);
};
