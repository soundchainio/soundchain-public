const linksRegex = /\bhttps?:\/\/\S+/gi;

const normalizeYoutube = (str: string) => {
  if (str) return str.replace('/watch?v=', '/embed/');
};

const normalizeAll = async (str: string) => {
  let text = normalizeYoutube(str);
  return text;
};

export const getNormalizedLink = async (str: string) => {
  const links = str.match(linksRegex) || [];
  return await normalizeAll(links[0]);
};
