import { Field, ObjectType } from 'type-graphql';
import { Profile } from '../models/Profile';

@ObjectType()
export class SubscribeProfilePayload {
  @Field()
  subscribedProfile: Profile;
}
