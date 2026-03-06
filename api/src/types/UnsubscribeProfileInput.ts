import { Field, InputType } from 'type-graphql';

@InputType()
export class UnsubscribeFromProfileInput {
  @Field()
  profileId: string;
}
