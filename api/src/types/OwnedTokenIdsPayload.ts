import { Field, ObjectType } from 'type-graphql';

@ObjectType()
export class OwnedTokenIdsPayload {
  @Field(() => [Number])
  tokenIds: number[];
}
