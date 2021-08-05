import { ArrayMaxSize, ArrayUnique } from 'class-validator';
import { Field, InputType } from 'type-graphql';
import { Genre } from '../../enums/Genres';

@InputType()
export class UpdateFavoriteGenresInput {
  @ArrayMaxSize(5)
  @ArrayUnique()
  @Field(() => [Genre])
  favoriteGenres: Genre[];
}
