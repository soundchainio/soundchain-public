import { Field, ObjectType } from 'type-graphql';
import { TrackFromPlaylist } from '../models/TrackFromPlaylist';
import { PageInfo } from './PageInfo';


@ObjectType()
export class GetTracksFromPlaylist {
  @Field()
  pageInfo: PageInfo;

  @Field(() => [TrackFromPlaylist], { nullable: true })
  nodes: TrackFromPlaylist
}
