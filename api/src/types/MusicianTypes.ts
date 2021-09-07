import { registerEnumType } from 'type-graphql';

enum MusicianType {
  SINGER = 'Singer',
  DRUMMER = 'Drummer',
  GUITARIST = 'Guitarist',
  PRODUCER = 'Producer',
}

registerEnumType(MusicianType, {
  name: 'MusicianType',
});

export { MusicianType };
