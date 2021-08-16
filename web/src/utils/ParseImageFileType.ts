import { AcceptedImageFileTypes } from 'lib/graphql';

export const parseImageFileType = (type: string): AcceptedImageFileTypes => {
  switch (type) {
    case 'image/jpeg':
      return AcceptedImageFileTypes.Jpeg;
    case 'image/png':
      return AcceptedImageFileTypes.Png;
    default:
      return AcceptedImageFileTypes.Png;
  }
};
