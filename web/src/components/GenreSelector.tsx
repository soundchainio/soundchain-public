import { Genre } from 'lib/graphql';
import React, { useEffect, useState } from 'react';
import { Badge } from './Badge';
import { Label } from './Label';
import { genres } from 'utils/Genres'

interface GenreSelectorProps {
  onSelect: (selectedGenres: Genre[]) => void;
  initialValue?: Genre[]
}

export const GenreSelector = ({ onSelect, initialValue }: GenreSelectorProps) => {
  const [selectedGenres, setSelectedGenres] = useState<Genre[]>(initialValue || []);

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
