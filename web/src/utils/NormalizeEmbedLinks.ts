import axios from 'axios';

const linksRegex = /\bhttps?:\/\/\S+/gi;
const ytRegex = /(?:https?:\/\/)?(?:www\.)?youtu\.?be(?:\.com)?\/?.*(?:watch|embed)?(?:.*v=|v\/|\/)([\w\-_]+)\&?/;

const scRegex = /^https?:\/\/(soundcloud\.com|snd\.sc)\/(.*)$/;
const scLinkRegex = /(?<=src=\").*(?=\">)/g;

const sfRegex = /(open\.spotify\.com\/track\/)/;
const sfLinkRegex = /(?<=track\/).*(?=\?)/g;

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
    const src = iframeString.match(scLinkRegex) || [];
    return src[0];
  }

  return str;
};

const normalizeSpotify = async (str: string) => {
  const songId = str.match(sfLinkRegex) || [];
  if (songId[0]) {
    const spotifyUrl = 'https://open.spotify.com/embed/track/' + songId[0];
    return spotifyUrl;
  }

  return str;
};

export const getNormalizedLink = async (str: string) => {
  const link = (str.match(linksRegex) || [])[0];

  if (ytRegex.test(link)) return normalizeYoutube(link);
  if (scRegex.test(link)) return await normalizeSoundcloud(link);
  if (sfRegex.test(link)) return normalizeSpotify(link);
};

export const hasLink = (str: string) => {
  return str.match(linksRegex) ? true : false;
};
