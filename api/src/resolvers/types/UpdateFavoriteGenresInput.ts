import { ArrayUnique } from 'class-validator';
import { Genre } from 'enums/Genres';
import { Field, InputType } from 'type-graphql';

@InputType()
export class UpdateFavoriteGenresInput {
  @ArrayUnique()
  @Field(() => [Genre])
  favoriteGenres: Genre[];
}
