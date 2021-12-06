import { Field, ObjectType } from 'type-graphql';
import { Profile } from '../models/Profile';
import { PageInfo } from './PageInfo';

@ObjectType()
export class FollowedArtistsConnection {
  @Field()
  pageInfo: PageInfo;

  @Field(() => [Profile])
  nodes: Profile[];
}
