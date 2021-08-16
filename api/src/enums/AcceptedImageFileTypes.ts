import { registerEnumType } from 'type-graphql';

enum AcceptedImageFileTypes {
  JPEG = 'image/jpeg',
  PNG = 'image/png',
}

registerEnumType(AcceptedImageFileTypes, {
  name: 'AcceptedImageFileTypes',
});

export { AcceptedImageFileTypes };
