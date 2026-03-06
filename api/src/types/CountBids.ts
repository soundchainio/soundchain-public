import { Field, ObjectType } from 'type-graphql';

@ObjectType()
export class CountBidsPayload {
  @Field({ nullable: true })
  numberOfBids: number;
}
