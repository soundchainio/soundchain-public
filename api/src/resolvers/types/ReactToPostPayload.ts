import { Reaction } from 'models/Reaction';
import { Field, ObjectType } from 'type-graphql';

@ObjectType()
export class ReactToPostPayload {
  @Field()
  reaction: Reaction;
}
