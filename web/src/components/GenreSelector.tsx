import { Genre } from 'lib/graphql';
import React, { useEffect, useState } from 'react';
import { Badge } from './Badge';
import { Label } from './Label';

type GenreLabels = {
  key: Genre;
  label: string;
};

const genres: GenreLabels[] = [
  { key: Genre.Acoustic, label: 'Acoustic' },
  { key: Genre.Alternative, label: 'Alternative' },
  { key: Genre.Ambient, label: 'Ambient' },
  { key: Genre.Americana, label: 'Americana' },
  { key: Genre.CPop, label: 'C-Pop' },
  { key: Genre.Christian, label: 'Christian' },
  { key: Genre.ClassicRock, label: 'Classic Rock' },
  { key: Genre.Classical, label: 'Classical' },
  { key: Genre.Country, label: 'Country' },
  { key: Genre.Dance, label: 'Dance' },
  { key: Genre.Devotional, label: 'Devotional' },
  { key: Genre.Eletronic, label: 'Eletronic' },
  { key: Genre.Experimental, label: 'Experimental' },
  { key: Genre.Gospel, label: 'Gospel' },
  { key: Genre.HardRock, label: 'Hard Rock' },
  { key: Genre.Indie, label: 'Indie' },
  { key: Genre.Jazz, label: 'Jazz' },
  { key: Genre.KPop, label: 'K-Pop' },
  { key: Genre.KidsAndFamily, label: 'Kids & Family' },
  { key: Genre.Latin, label: 'Latin' },
  { key: Genre.Metal, label: 'Metal' },
  { key: Genre.MusicaMexicana, label: 'Musica Mexicana' },
  { key: Genre.MusicaTropical, label: 'Musica Tropical' },
  { key: Genre.Podcasts, label: 'Podcasts' },
  { key: Genre.Pop, label: 'Pop' },
  { key: Genre.PopLatino, label: 'Pop Latino' },
  { key: Genre.Punk, label: 'Punk' },
  { key: Genre.RAndB, label: 'R & B' },
  { key: Genre.Reggae, label: 'Reggae' },
  { key: Genre.Salsa, label: 'Salsa' },
  { key: Genre.SoulFunk, label: 'Soul/Funk' },
  { key: Genre.Soundtrack, label: 'Soundtrack' },
  { key: Genre.Spoken, label: 'Spoken' },
  { key: Genre.UrbanLatino, label: 'Urban Latino' },
  { key: Genre.World, label: 'World' },
];

interface GenreSelectorProps {
  onSelect: (selectedGenres: Genre[]) => void;
}

export const GenreSelector = ({ onSelect }: GenreSelectorProps) => {
  const [selectedGenres, setSelectedGenres] = useState<Genre[]>([]);

  useEffect(() => {
    onSelect(selectedGenres);
  }, [onSelect, selectedGenres]);

  const isGenreSelected = (key: Genre): boolean => {
    return selectedGenres.some(selectedGenre => selectedGenre === key);
  };

  const onGenreClick = (key: Genre) => {
    if (isGenreSelected(key)) setSelectedGenres(selectedGenres.filter(selectedGenre => selectedGenre !== key));
    else setSelectedGenres([...selectedGenres, key]);
  };

  return (
    <div className="flex flex-col">
      <Label>What are your favorite genres? {selectedGenres.length ? `(${selectedGenres.length} Selected)` : ''}</Label>
      <div className="pb-6 space-y-2">
        {genres.map(({ label, key }) => (
          <Badge key={key} label={label} selected={isGenreSelected(key)} onClick={() => onGenreClick(key)} />
        ))}
      </div>
    </div>
  );
};
