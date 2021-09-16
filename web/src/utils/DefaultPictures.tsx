import { Waves } from '../components/Covers/Waves';
import { Clouds } from '../components/Covers/Clouds';
import { Rings } from '../components/Covers/Rings';
import { Net } from '../components/Covers/Net';
import { Birds } from '../components/Covers/Birds';

export const profilePictures = ['red', 'orange', 'yellow', 'green', 'light-blue', 'blue', 'purple', 'pink'];
export const coverPictures = {
  'default-waves': <Waves />,
  'default-clouds': <Clouds />,
  'default-rings': <Rings />,
  'default-net': <Net />,
  'default-birds': <Birds />,
};

export const getRandomProfilePicture = () => {
  return profilePictures[Math.round(Math.random() * profilePictures.length)];
};

export const getDefaultProfilePicturePath = (picture: string) => {
  return `/defaultPictures/profile/${picture}.png`;
};

export const getDefaultCoverPicturePath = (picture: string) => {
  return `/defaultPictures/cover/${picture}.jpeg`;
};
