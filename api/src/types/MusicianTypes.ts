import { registerEnumType } from 'type-graphql';

enum MusicianType {
  SINGER = 'Singer',
  DRUMMER = 'Drummer',
  GUITARIST = 'Guitarist',
  PRODUCER = 'Producer',
  EMCEE = 'Emcee',
  BEAT_MAKER = 'Beat Maker',
  DJ = 'DJ',
  ENGINEER = 'Engineer',
  INSTRUMENTALIST = 'Instrumentalist',
  NOT_AN_ARTIST = 'Not an Artist',
}

registerEnumType(MusicianType, {
  name: 'MusicianType',
});

export { MusicianType };
