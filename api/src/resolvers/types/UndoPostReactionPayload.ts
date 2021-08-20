import { Field, ObjectType } from 'type-graphql';
import { Reaction } from '../../models/Reaction';

@ObjectType()
export class UndoPostReactionPayload {
  @Field()
  reaction: Reaction;
}
