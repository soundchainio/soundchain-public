import axios from 'axios';

const linksRegex = /\bhttps?:\/\/\S+/gi;

const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?youtu\.?be(?:\.com)?\/?.*(?:watch|embed)?(?:.*v=|v\/|\/)([\w\-_]+)\&?/;

const soundcloudRegex = /^https?:\/\/(soundcloud\.com|snd\.sc)\/(.*)$/;
const soundcloudLinkRegex = /(?<=src=\").*(?=\">)/g;

const spotifyRegex = /(open\.spotify\.com\/track\/)/;
const spotifyLinkRegex = /(?<=track\/).*(?=\?)/g;

const vimeoRegex = /(vimeo.com\/)/;
const vimeoLinkRegex = /(?<=vimeo.com\/).*$/g;

const normalizeYoutube = (str: string) => {
  return str.replace('/watch?v=', '/embed/');
};

const normalizeSoundcloud = async (str: string) => {
  const soundcloudUrl = `http://soundcloud.com/oembed?format=js&url=${str}&iframe=false`;
  const songInfo = await axios(soundcloudUrl);
  if (songInfo.data) {
    // it returns a string '({a: test1, b: test2});'
    // we have to remove the first and last 2 characters from the response to parse as JSON
    const iframeString = JSON.parse(songInfo.data.substring(1).slice(0, -2)).html;
    const src = iframeString.match(soundcloudLinkRegex) || [];
    return src[0];
  }

  return str;
};

const normalizeSpotify = async (str: string) => {
  const songId = (str.match(spotifyLinkRegex) || [])[0];
  if (songId[0]) {
    const spotifyUrl = `https://open.spotify.com/embed/track/${songId}`;
    return spotifyUrl;
  }

  return str;
};

const normalizeVimeo = async (str: string) => {
  const videoId = (str.match(vimeoLinkRegex) || [])[0];
  if (videoId) {
    return `https://player.vimeo.com/video/${videoId}`;
  }
  return str;
};

export const getNormalizedLink = async (str: string) => {
  const link = (str.match(linksRegex) || [])[0];

  if (youtubeRegex.test(link)) return normalizeYoutube(link);
  if (soundcloudRegex.test(link)) return await normalizeSoundcloud(link);
  if (spotifyRegex.test(link)) return normalizeSpotify(link);
  if (vimeoRegex.test(link)) return normalizeVimeo(link);
};

export const hasLink = (str: string) => {
  return str.match(linksRegex) ? true : false;
};
