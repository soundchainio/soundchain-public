import { Badge } from 'components/Badge';
import { Button, ButtonProps } from 'components/Button';
import { Label } from 'components/Label';
import { Genre, useUpdateFavoriteGenresMutation } from 'lib/graphql';
import React, { useEffect, useState } from 'react';
import { GenreLabel, genres } from 'utils/Genres';

interface FavoriteGenreFormProps {
  afterSubmit: () => void;
  initialGenres?: Genre[];
  submitProps?: ButtonProps;
  submitText: string;
}

export const FavoriteGenresForm = ({
  afterSubmit,
  submitProps,
  submitText,
  initialGenres = [],
}: FavoriteGenreFormProps) => {
  const [favoriteGenres, setFavoriteGenres] = useState<Genre[]>([]);
  const [updateFavoriteGenres, { loading }] = useUpdateFavoriteGenresMutation();

  useEffect(() => {
    if (initialGenres.length) {
      setFavoriteGenres(initialGenres);
    }
  }, [initialGenres]);

  const handleSubmit = async () => {
    await updateFavoriteGenres({ variables: { input: { favoriteGenres } } });
    afterSubmit();
  };

  const handleGenreClick = (genre: Genre) => {
    if (favoriteGenres.includes(genre)) {
      const nextGenres = favoriteGenres.filter(g => g !== genre);
      setFavoriteGenres(nextGenres);
      return;
    }

    setFavoriteGenres([...favoriteGenres, genre]);
  };

  return (
    <>
      <div className="flex-grow flex">
        <div className="flex flex-col">
          <Label>
            What are your favorite genres? {favoriteGenres.length ? `(${favoriteGenres.length} Selected)` : ''}
          </Label>
          <div className="pb-6 space-y-2">
            {genres.map(({ label, key }: GenreLabel) => (
              <Badge
                key={key}
                label={label}
                selected={favoriteGenres.includes(key)}
                onClick={() => handleGenreClick(key)}
                className="mr-2"
              />
            ))}
          </div>
        </div>
      </div>
      <div className="flex flex-col">
        <Button
          onClick={handleSubmit}
          type="submit"
          disabled={loading}
          variant="outline"
          className="h-12 mt-4"
          {...submitProps}
        >
          {submitText}
        </Button>
      </div>
    </>
  );
};
