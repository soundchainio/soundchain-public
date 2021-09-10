import { Field, ObjectType } from 'type-graphql';
import { Follow } from '../models/Follow';
import { PageInfo } from './PageInfo';

@ObjectType()
export class FollowConnection {
  @Field()
  pageInfo: PageInfo;

  @Field(() => [Follow])
  nodes: Follow[];
}
