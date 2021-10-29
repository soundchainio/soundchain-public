import { Field, ObjectType } from 'type-graphql';

@ObjectType()
export class IncrementPlaybackCountPayload {
  @Field()
  success: boolean;
}
