import { MusicianType } from 'lib/graphql'

type MusicianTypeLabels = {
  key: MusicianType
  label: string
}

export const musicianTypes: MusicianTypeLabels[] = [
  { key: MusicianType.BeatMaker, label: 'Beat Maker' },
  { key: MusicianType.Dj, label: 'DJ' },
  { key: MusicianType.Drummer, label: 'Drummer' },
  { key: MusicianType.Emcee, label: 'Emcee' },
  { key: MusicianType.Engineer, label: 'Engineer' },
  { key: MusicianType.Guitarist, label: 'Guitarist' },
  { key: MusicianType.Instrumentalist, label: 'Instrumentalist' },
  { key: MusicianType.NotAnArtist, label: 'Creator' },
  { key: MusicianType.Producer, label: 'Producer' },
  { key: MusicianType.Singer, label: 'Singer' },
]

export function getMusicianTypeLabelByKey(key: MusicianType): string | undefined {
  return musicianTypes.find(g => g.key === key)?.label
}
