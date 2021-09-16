import { Cells } from 'components/Covers/Cells';
import { Fog } from 'components/Covers/Fog';
import { Birds } from '../components/Covers/Birds';
import { Net } from '../components/Covers/Net';
import { Rings } from '../components/Covers/Rings';
import { Waves } from '../components/Covers/Waves';

export const profilePictures = ['red', 'orange', 'yellow', 'green', 'light-blue', 'blue', 'purple', 'pink'];
export const coverPictures = {
  'default-waves': <Waves />,
  'default-rings': <Rings />,
  'default-net': <Net />,
  'default-birds': <Birds />,
  'default-cells': <Cells />,
  'default-fog': <Fog />,
};

export const getRandomProfilePicture = () => {
  return `default-${profilePictures[Math.round(Math.random() * profilePictures.length)]}`;
};

export const getDefaultProfilePicturePath = (picture: string) => {
  return `/defaultPictures/profile/${picture}.png`;
};

export const getDefaultCoverPicturePath = (picture: string) => {
  return `/defaultPictures/cover/${picture}.jpeg`;
};
