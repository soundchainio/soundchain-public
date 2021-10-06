import { Field, ObjectType } from 'type-graphql';

@ObjectType()
export class PinningPayload {
  @Field()
  cid: string;
}
