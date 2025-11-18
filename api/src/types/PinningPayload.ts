import { Field, ObjectType } from 'type-graphql';

@ObjectType()
export class PinningPayload {
  @Field(() => String)
  cid: string;
}
