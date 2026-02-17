import { Field, ObjectType } from 'type-graphql';
import { WallPost } from '../models/WallPost';
import { PageInfo } from './PageInfo';

@ObjectType()
export class WallPostConnection {
  @Field(() => [WallPost])
  nodes: WallPost[];

  @Field(() => PageInfo)
  pageInfo: PageInfo;
}
