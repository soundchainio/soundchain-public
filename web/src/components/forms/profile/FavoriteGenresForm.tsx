import { Badge } from 'components/common/Badges/Badge'
import { Button, ButtonProps } from 'components/common/Buttons/Button'
import { Label } from 'components/Label'
import { Genre } from 'lib/graphql'
import React, { useEffect, useState } from 'react'
import { GenreLabel, genres } from 'utils/Genres'

interface FavoriteGenreFormProps {
  afterSubmit: () => void
  initialGenres?: Genre[]
  submitProps?: ButtonProps
  submitText: string
}

export const FavoriteGenresForm = ({
  afterSubmit,
  submitProps,
  submitText,
  initialGenres = [],
}: FavoriteGenreFormProps) => {
  const [favoriteGenres, setFavoriteGenres] = useState<Genre[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (initialGenres.length) {
      setFavoriteGenres(initialGenres)
    }
  }, [initialGenres])

  const handleSubmit = async () => {
    setLoading(true)
    try {
      await fetch('/api/profile/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: { favoriteGenres } }),
      })
      afterSubmit()
    } finally {
      setLoading(false)
    }
  }

  const handleGenreClick = (genre: Genre) => {
    if (favoriteGenres.includes(genre)) {
      const nextGenres = favoriteGenres.filter(g => g !== genre)
      setFavoriteGenres(nextGenres)
      return
    }

    setFavoriteGenres([...favoriteGenres, genre])
  }

  return (
    <>
      <div className="flex flex-grow">
        <div className="flex flex-col">
          <Label grayScale="80">
            What are your favorite genres? {favoriteGenres.length ? `(${favoriteGenres.length} Selected)` : ''}
          </Label>
          <div className="space-y-2 pb-6">
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
          className="mt-4 h-12"
          {...submitProps}
        >
          {submitText}
        </Button>
      </div>
    </>
  )
}
