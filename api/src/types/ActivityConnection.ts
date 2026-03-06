import { Field, ObjectType } from 'type-graphql';
import { Activity } from '../models/Activity';
import { PageInfo } from './PageInfo';

@ObjectType()
export class ActivityConnection {
  @Field(() => PageInfo)
  pageInfo: PageInfo;

  @Field(() => [Activity])
  nodes: Activity[];
}
