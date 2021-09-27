import { registerEnumType } from 'type-graphql';

enum UploadFileType {
  JPEG = 'image/jpeg',
  PNG = 'image/png',
  VIDEO = 'video/mp4',
  AUDIO = 'audio/mpeg',
}

registerEnumType(UploadFileType, {
  name: 'UploadFileType',
});

export { UploadFileType };
