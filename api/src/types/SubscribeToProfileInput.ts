import { Field, InputType } from 'type-graphql';

@InputType()
export class SubscribeToProfileInput {
  @Field()
  profileId: string;
}
