export const defaultProfilePictures = ['red', 'orange', 'yellow', 'green', 'light-blue', 'blue', 'purple', 'pink'];

export const getRandomProfilePicture = () => {
  return defaultProfilePictures[Math.round(Math.random() * defaultProfilePictures.length)];
};

export const getDefaultProfilePicturePath = (picture: string) => {
  return `/defaultPictures/profile/default-${picture}.png`;
};
