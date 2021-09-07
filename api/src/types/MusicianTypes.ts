import { registerEnumType } from 'type-graphql';

enum MusicianType {
  SINGER = 'singer',
  DRUMMER = 'drummer',
  GUITARIST = 'guitarist',
  PRODUCES = 'producer',
}

registerEnumType(MusicianType, {
  name: 'MusicianType',
});

export { MusicianType };
