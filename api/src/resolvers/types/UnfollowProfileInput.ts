import { Field, InputType } from 'type-graphql';

@InputType()
export class UnfollowProfileInput {
  @Field()
  followedId: string;
}
