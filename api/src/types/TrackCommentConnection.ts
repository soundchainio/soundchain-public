import { Field, ObjectType } from 'type-graphql';
import { TrackComment } from '../models/TrackComment';
import { PageInfo } from './PageInfo';

@ObjectType()
export class TrackCommentConnection {
  @Field()
  pageInfo: PageInfo;

  @Field(() => [TrackComment])
  nodes: TrackComment[];
}
