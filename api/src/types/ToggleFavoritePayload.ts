import { Field, ObjectType } from 'type-graphql';
import { FavoriteProfileTrack } from '../models/FavoriteProfileTrack';

@ObjectType()
export class ToggleFavoritePayload {
  @Field()
  favoriteProfileTrack: FavoriteProfileTrack;
}
