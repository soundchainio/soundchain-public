import { UploadFileType } from 'lib/graphql';

export const parseUploadFileType = (type: string): UploadFileType => {
  switch (type) {
    case 'image/jpeg':
      return UploadFileType.Jpeg;
    case 'image/png':
      return UploadFileType.Png;
    default:
      throw new Error('Invalid file type');
  }
};
