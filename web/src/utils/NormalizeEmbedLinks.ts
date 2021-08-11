const linksRegex = /\bhttps?:\/\/\S+/gi;

const normalizeYoutube = (str: string) => {
  if (str) return str.replace('/watch?v=', '/embed/');
};

const normalizeAll = (str: string) => {
  const text = normalizeYoutube(str);
  return text;
};

export const getNormalizedLink = (str: string) => {
  const links = str.match(linksRegex) || [];
  return normalizeAll(links[0]);
};
