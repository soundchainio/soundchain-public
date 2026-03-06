import { Field, ObjectType } from 'type-graphql';
import { Playlist } from '../models/Playlist';

@ObjectType()
export class CreatePlaylistPayload {
  @Field()
  playlist: Playlist;
}
