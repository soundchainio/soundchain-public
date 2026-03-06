import { Field, ObjectType } from 'type-graphql';
import { Message } from '../models/Message';
import { PageInfo } from './PageInfo';

@ObjectType()
export class MessageConnection {
  @Field()
  pageInfo: PageInfo;

  @Field(() => [Message])
  nodes: Message[];
}
