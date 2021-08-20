import { Field, ObjectType } from 'type-graphql';
import { Reaction } from '../../models/Reaction';

@ObjectType()
export class ReactToPostPayload {
  @Field()
  reaction: Reaction;
}
