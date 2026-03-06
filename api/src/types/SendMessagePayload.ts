import { Field, ObjectType } from 'type-graphql';
import { Message } from '../models/Message';

@ObjectType()
export class SendMessagePayload {
  @Field()
  message: Message;
}
