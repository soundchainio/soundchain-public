import { AcceptedProfileImageFileTypes } from 'lib/graphql';

export const parseProfileImageFileType = (type: string): AcceptedProfileImageFileTypes => {
  switch (type) {
    case 'image/jpeg':
      return AcceptedProfileImageFileTypes.Jpeg;
    case 'image/png':
      return AcceptedProfileImageFileTypes.Png;
    default:
      throw new Error('Invalid file type');
  }
};
