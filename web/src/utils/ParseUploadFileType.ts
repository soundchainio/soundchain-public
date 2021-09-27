import { UploadFileType } from 'lib/graphql';

export const parseUploadFileType = (type: string): UploadFileType => {
  switch (type) {
    case 'image/jpeg':
      return UploadFileType.Jpeg;
    case 'image/png':
      return UploadFileType.Png;
    case 'video/mp4':
      return UploadFileType.Video;
    case 'audio/mpeg':
      return UploadFileType.Audio;
    default:
      throw new Error('Invalid file type');
  }
};
