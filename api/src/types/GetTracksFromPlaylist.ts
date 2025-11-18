import { Field, ObjectType } from 'type-graphql';
import { PlaylistTrack } from '../models/PlaylistTrack';
import { PageInfo } from './PageInfo';


@ObjectType()
export class GetTracksFromPlaylist {
  @Field(() => PageInfo)
  pageInfo: PageInfo;

  @Field(() => [PlaylistTrack], { nullable: true })
  nodes: PlaylistTrack
}
