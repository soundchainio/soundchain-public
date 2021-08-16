import { registerEnumType } from 'type-graphql';

enum AcceptedProfileImageFileTypes {
  JPEG = 'image/jpeg',
  PNG = 'image/png',
}

registerEnumType(AcceptedProfileImageFileTypes, {
  name: 'AcceptedProfileImageFileTypes',
});

export { AcceptedProfileImageFileTypes };
