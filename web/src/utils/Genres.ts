import { Genre } from 'lib/graphql';

export type GenreLabel = {
  key: Genre;
  label: string;
};

export const genres: GenreLabel[] = [
  { key: Genre.Acoustic, label: 'Acoustic' },
  { key: Genre.Alternative, label: 'Alternative' },
  { key: Genre.Ambient, label: 'Ambient' },
  { key: Genre.Americana, label: 'Americana' },
  { key: Genre.Blues, label: 'Blues' },
  { key: Genre.Cannabis, label: 'Cannabis' },
  { key: Genre.CPop, label: 'C-Pop' },
  { key: Genre.Christian, label: 'Christian' },
  { key: Genre.ClassicRock, label: 'Classic Rock' },
  { key: Genre.Classical, label: 'Classical' },
  { key: Genre.Country, label: 'Country' },
  { key: Genre.Dance, label: 'Dance' },
  { key: Genre.Devotional, label: 'Devotional' },
  { key: Genre.Electronic, label: 'Electronic' },
  { key: Genre.Experimental, label: 'Experimental' },
  { key: Genre.Gospel, label: 'Gospel' },
  { key: Genre.HardRock, label: 'Hard Rock' },
  { key: Genre.HipHop, label: 'Hip-Hop' },
  { key: Genre.House, label: 'House' },
  { key: Genre.Indie, label: 'Indie' },
  { key: Genre.Instrumental, label: 'Instrumental' },
  { key: Genre.Jazz, label: 'Jazz' },
  { key: Genre.KPop, label: 'K-Pop' },
  { key: Genre.KidsAndFamily, label: 'Kids & Family' },
  { key: Genre.Latin, label: 'Latin' },
  { key: Genre.Lofi, label: 'LoFi' },
  { key: Genre.Metal, label: 'Metal' },
  { key: Genre.MusicaMexicana, label: 'Musica Mexicana' },
  { key: Genre.MusicaTropical, label: 'Musica Tropical' },
  { key: Genre.Podcasts, label: 'Podcasts' },
  { key: Genre.Pop, label: 'Pop' },
  { key: Genre.PopLatino, label: 'Pop Latino' },
  { key: Genre.Punk, label: 'Punk' },
  { key: Genre.Reggaeton, label: 'Reggaeton' },
  { key: Genre.RAndB, label: 'R & B' },
  { key: Genre.Reggae, label: 'Reggae' },
  { key: Genre.Samples, label: 'Samples' },
  { key: Genre.Salsa, label: 'Salsa' },
  { key: Genre.SoulFunk, label: 'Soul/Funk' },
  { key: Genre.Soundbath, label: 'SoundBath' },
  { key: Genre.Soundtrack, label: 'Soundtrack' },
  { key: Genre.Spoken, label: 'Spoken' },
  { key: Genre.UrbanLatino, label: 'Urban Latino' },
  { key: Genre.World, label: 'World' },
];

export function getGenreLabelByKey(key: Genre): string | undefined {
  return genres.find(g => g.key === key)?.label;
}
