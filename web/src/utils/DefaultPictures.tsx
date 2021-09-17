import { Cells } from 'components/profile-covers/Cells';
import { Fog } from 'components/profile-covers/Fog';
import { Birds } from '../components/profile-covers/Birds';
import { Net } from '../components/profile-covers/Net';
import { Rings } from '../components/profile-covers/Rings';
import { Waves } from '../components/profile-covers/Waves';

export const profilePictures = ['red', 'orange', 'yellow', 'green', 'teal', 'blue', 'purple', 'pink'];
export const coverPictures = {
  'default-waves': <Waves />,
  'default-rings': <Rings />,
  'default-net': <Net />,
  'default-birds': <Birds />,
  'default-cells': <Cells />,
  'default-fog': <Fog />,
};
export type CoverPictureOptions =
  | 'default-waves'
  | 'default-rings'
  | 'default-net'
  | 'default-birds'
  | 'default-cells'
  | 'default-fog';

export const getRandomProfilePicture = () => {
  return `default-${profilePictures[Math.round(Math.random() * profilePictures.length)]}`;
};

export const getDefaultProfilePicturePath = (picture: string) => {
  return `/default-pictures/profile/${picture}.png`;
};

export const getDefaultCoverPicturePath = (picture: string) => {
  return `/default-pictures/cover/${picture}.jpeg`;
};
