import { Field, ObjectType } from 'type-graphql';
import { Track } from '../models/Track';

@ObjectType()
export class GenreTracks {
  @Field(() => String)
  genre: string;

  @Field(() => [Track])
  tracks: Track[];
}
