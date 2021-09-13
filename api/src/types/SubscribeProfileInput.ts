import { Field, InputType } from 'type-graphql';

@InputType()
export class SubscribeProfileInput {
  @Field()
  subscribedProfileId: string;
}
