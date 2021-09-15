import { registerEnumType } from 'type-graphql';

enum ImageUploadFileType {
  JPEG = 'image/jpeg',
  PNG = 'image/png',
}

registerEnumType(ImageUploadFileType, {
  name: 'ImageUploadFileType',
});

export { ImageUploadFileType };
