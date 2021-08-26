import { ArrayUnique } from 'class-validator';
import { Field, InputType } from 'type-graphql';
import { Genre } from './Genres';

@InputType()
export class UpdateFavoriteGenresInput {
  @ArrayUnique()
  @Field(() => [Genre])
  favoriteGenres: Genre[];
}
