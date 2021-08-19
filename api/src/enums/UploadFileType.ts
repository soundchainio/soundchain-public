import { registerEnumType } from 'type-graphql';

enum UploadFileType {
  JPEG = 'image/jpeg',
  PNG = 'image/png',
}

registerEnumType(UploadFileType, {
  name: 'UploadFileType',
});

export { UploadFileType };
