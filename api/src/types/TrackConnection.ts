import { Field, ObjectType } from 'type-graphql';
import { Track } from '../models/Track';
import { PageInfo } from './PageInfo';

@ObjectType()
export class TrackConnection {
  @Field()
  pageInfo: PageInfo;

  @Field(() => [Track])
  nodes: Track[];
}
