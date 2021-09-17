import { registerEnumType } from 'type-graphql';

enum DefaultCoverPicture {
  BIRDS = 'birds',
  CELLS = 'cells',
  FOG = 'fog',
  NET = 'net',
  RINGS = 'rings',
  WAVES = 'waves',
}

registerEnumType(DefaultCoverPicture, {
  name: 'DefaultCoverPicture',
});

export { DefaultCoverPicture };
