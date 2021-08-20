import { Profile } from 'models/Profile';
import { Field, ObjectType } from 'type-graphql';

@ObjectType()
export class UnfollowProfilePayload {
  @Field()
  unfollowedProfile: Profile;
}
