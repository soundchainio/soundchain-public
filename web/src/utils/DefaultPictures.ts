export const profilePictures = ['red', 'orange', 'yellow', 'green', 'light-blue', 'blue', 'purple', 'pink'];
export const coverPictures = ['waves', 'clouds', 'rings', 'net', 'dots', 'halo', 'topology'];

export const getRandomProfilePicture = () => {
  return profilePictures[Math.round(Math.random() * profilePictures.length)];
};

export const getDefaultProfilePicturePath = (picture: string) => {
  return `/defaultPictures/profile/default-${picture}.png`;
};

export const getDefaultCoverPicturePath = (picture: string) => {
  return `/defaultPictures/cover/default-${picture}.jpeg`;
};
