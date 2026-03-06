import { Field, ObjectType } from 'type-graphql';
import { Reaction } from '../models/Reaction';
import { PageInfo } from './PageInfo';

@ObjectType()
export class ReactionConnection {
  @Field()
  pageInfo: PageInfo;

  @Field(() => [Reaction])
  nodes: Reaction[];
}
