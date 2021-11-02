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
}

registerEnumType(MusicianType, {
  name: 'MusicianType',
});

export { MusicianType };
