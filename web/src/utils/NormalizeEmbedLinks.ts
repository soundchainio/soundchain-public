import axios from 'axios';

const linksRegex = /\bhttps?:\/\/\S+/gi;
const ytRegex = /(?:https?:\/\/)?(?:www\.)?youtu\.?be(?:\.com)?\/?.*(?:watch|embed)?(?:.*v=|v\/|\/)([\w\-_]+)\&?/;
const scRegex = /^https?:\/\/(soundcloud\.com|snd\.sc)\/(.*)$/;

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
    const src = iframeString.match(/(?<=src=\").*(?=\">)/g) || [];
    return src[0];
  }

  return str;
};

export const getNormalizedLink = async (str: string) => {
  const link = (str.match(linksRegex) || [])[0];

  if (ytRegex.test(link)) return normalizeYoutube(link);
  if (scRegex.test(link)) return await normalizeSoundcloud(link);
};

export const hasLink = (str: string) => {
  return str.match(linksRegex) ? true : false;
};
