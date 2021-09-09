import { MusicianType } from 'lib/graphql';

type MusicianTypeLabels = {
  key: MusicianType;
  label: string;
};

export const musicianTypes: MusicianTypeLabels[] = [
  { key: MusicianType.Singer, label: 'Singer' },
  { key: MusicianType.Guitarist, label: 'Guitarist' },
  { key: MusicianType.Drummer, label: 'Drummer' },
  { key: MusicianType.Producer, label: 'Producer' },
];

export function getMusicianTypeLabelByKey(key: MusicianType): string | undefined {
  return musicianTypes.find((g) => g.key === key)?.label
}