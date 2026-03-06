import { Field, ObjectType } from 'type-graphql';
import { Playlist } from '../models/Playlist';
import { PageInfo } from './PageInfo';

@ObjectType()
export class GetPlaylistPayload {
  @Field()
  pageInfo: PageInfo;

  @Field(() => [Playlist])
  nodes: Playlist[];
}