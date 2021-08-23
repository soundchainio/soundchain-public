import { Field, ObjectType } from 'type-graphql';
import { NotificationUnion } from '../resolvers/NotificationResolver';
import { PageInfo } from './PageInfo';

@ObjectType()
export class NotificationConnection {
  @Field()
  pageInfo: PageInfo;

  @Field(() => [NotificationUnion])
  nodes: typeof NotificationUnion[];
}
