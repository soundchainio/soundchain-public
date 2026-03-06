import { Field, InputType } from 'type-graphql';

@InputType()
export class FollowProfileInput {
  @Field()
  followedId: string;
}
