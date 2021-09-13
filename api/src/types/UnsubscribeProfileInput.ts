import { Field, InputType } from 'type-graphql';

@InputType()
export class UnsubscribeProfileInput {
  @Field()
  subscribedProfileId: string;
}
