import { Field, ObjectType } from 'type-graphql';
import { Chat } from './Chat';
import { PageInfo } from './PageInfo';

@ObjectType()
export class ChatConnection {
  @Field(() => PageInfo)
  pageInfo: PageInfo;

  @Field(() => [Chat])
  nodes: Chat[];
}
